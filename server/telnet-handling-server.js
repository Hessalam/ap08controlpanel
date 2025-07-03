const express = require('express');
const net = require('net');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());

// --- Ensure data directory exists on startup ---
(async () => {
    try {
        await fs.access(DATA_DIR);
        console.log(`BACKEND: Data directory found at ${DATA_DIR}`);
    } catch (error) {
        console.log(`BACKEND: Data directory not found. Creating it at ${DATA_DIR}`);
        await fs.mkdir(DATA_DIR);
    }
})();


// --- Telnet Communication Helper (Accepts full device config) ---
function sendYealinkCommand(command, deviceConfig, expectJsonResponse = false) {
    return new Promise((resolve, reject) => {
        const { ip, port, username, password } = deviceConfig;
        
        if (!ip || !port || !username) {
            return reject(new Error("Invalid device configuration: IP, port, and username are required."));
        }

        const client = new net.Socket();
        let fullResponse = "";
        let passwordSent = false;
        let commandSent = false;
        let responseBuffer = "";

        const timeoutDuration = 8000;
        let operationTimeout = setTimeout(() => {
            if (!client.destroyed) client.destroy();
            reject(new Error(`Operation timed out after ${timeoutDuration / 1000}s for command: ${command.substring(0, 30)}...`));
        }, timeoutDuration);

        client.connect(port, ip, () => {
            console.log(`BACKEND: Connected to Yealink: ${ip}:${port}`);
        });

        client.on('data', (data) => {
            if (client.destroyed) return;
            clearTimeout(operationTimeout);
            operationTimeout = setTimeout(() => {
                if (!client.destroyed) client.destroy();
                reject(new Error(`Inactivity timeout after ${timeoutDuration / 1000}s for command: ${command.substring(0, 30)}...`));
            }, timeoutDuration);

            const dataStr = data.toString();
            console.log(`BACKEND: [${ip}] Raw Received:`, JSON.stringify(dataStr));
            fullResponse += dataStr;
            responseBuffer += dataStr;

            if (dataStr.includes("login:") && !commandSent) {
                console.log(`BACKEND: [${ip}] Sending username: ${username}`);
                client.write(username + "\r\n");
                return;
            }

            if (dataStr.includes("Password:") && !passwordSent) {
                console.log(`BACKEND: [${ip}] Sending password...`);
                client.write((password || "") + "\r\n");
                passwordSent = true;
                return;
            }

            if (!commandSent && fullResponse.includes("welcome yealink centralcontrol")) {
                 console.log(`BACKEND: [${ip}] Sending command to Yealink: ${command}`);
                 client.write(command + "\r\n");
                 commandSent = true;
                 responseBuffer = "";
                 fullResponse = "";
            }

            if (commandSent) {
                if (expectJsonResponse) {
                    try {
                        const jsonMatch = responseBuffer.match(/(?:.*\s)?({.*})\r\n/s);
                        if (jsonMatch && jsonMatch[1]) {
                            const jsonPart = jsonMatch[1];
                            const parsedJson = JSON.parse(jsonPart);
                            console.log(`BACKEND: [${ip}] Complete JSON response parsed.`);
                            if (!client.destroyed) client.end();
                            clearTimeout(operationTimeout);
                            resolve({ success: true, data: parsedJson, deviceRawResponse: responseBuffer.trim() });
                            return;
                        }
                    } catch (e) {
                        // Incomplete JSON, wait for more data
                    }
                } else {
                    if (responseBuffer.includes(command.split(' ')[0]) && !command.toLowerCase().includes("get")) {
                        console.log(`BACKEND: [${ip}] Non-JSON command echoed, likely successful.`);
                        if (!client.destroyed) client.end();
                        clearTimeout(operationTimeout);
                        resolve({ success: true, message: `Command acknowledged.`, deviceRawResponse: responseBuffer.trim() });
                        return;
                    }
                }
            }
        });

        client.on('end', () => clearTimeout(operationTimeout));
        client.on('error', (err) => {
            clearTimeout(operationTimeout);
            console.error(`BACKEND: [${ip}] Connection Error:`, err.message);
            if (!client.destroyed) client.destroy();
            reject(new Error(`Yealink connection error: ${err.message}`));
        });
        client.on('close', () => clearTimeout(operationTimeout));
    });
}

// --- Generic Command Handler ---
const commandHandler = (handler) => async (req, res) => {
    const { deviceConfig } = req.body;
    if (!deviceConfig) {
        return res.status(400).json({ success: false, message: "Device configuration is missing from the request." });
    }
    try {
        await handler(req, res, deviceConfig);
    } catch (error) {
        console.error(`BACKEND: API Error for ${req.path}:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- Device Management API ---
app.get('/api/devices', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        const devices = [];
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
                devices.push(JSON.parse(content));
            }
        }
        res.json({ success: true, devices });
    } catch (error) {
        console.error("BACKEND: Error listing devices:", error);
        res.status(500).json({ success: false, message: "Could not list devices." });
    }
});

app.post('/api/devices', async (req, res) => {
    const { name, ip, port, username, password } = req.body;
    if (!name || !ip || !username) {
        return res.status(400).json({ success: false, message: "Name, IP, and Username are required." });
    }
    const id = Date.now().toString();
    const deviceData = {
        id,
        name,
        ip,
        port: port || 6024, // Use provided port or default to 6024
        username,
        password: password || ""
    };
    try {
        await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(deviceData, null, 2));
        res.status(201).json({ success: true, message: `Device '${name}' saved.`, device: deviceData });
    } catch (error) {
        console.error("BACKEND: Error saving device:", error);
        res.status(500).json({ success: false, message: "Could not save device configuration." });
    }
});

app.delete('/api/devices/:id', async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(DATA_DIR, `${id}.json`);
    try {
        await fs.unlink(filePath);
        res.json({ success: true, message: `Device ${id} deleted.` });
    } catch (error) {
        console.error(`BACKEND: Error deleting device ${id}:`, error);
        res.status(500).json({ success: false, message: `Could not delete device ${id}.` });
    }
});

// --- Modified Command Endpoints ---
app.post('/api/system/set-status', commandHandler(async (req, res, deviceConfig) => {
    const { status, sn } = req.body;
    const payload = { status };
    if (sn) payload.sn = sn;
    const result = await sendYealinkCommand(`system set status ${JSON.stringify(payload)}`, deviceConfig, true);
    res.json({ success: true, message: `System status command for '${status}' sent.`, ...result });
}));

app.post('/api/system/get-hardware', commandHandler(async (req, res, deviceConfig) => {
    const { hal_list } = req.body;
    const result = await sendYealinkCommand(`system get hardware ${JSON.stringify({ hal_list })}`, deviceConfig, true);
    res.json({ success: true, gpioData: result.data.hal_list, ...result });
}));

app.post('/api/audio/mute-status', commandHandler(async (req, res, deviceConfig) => {
    const result = await sendYealinkCommand('audio get mute', deviceConfig, true);
    res.json({ success: true, status: result.data.status, ...result });
}));

app.post('/api/audio/set-mute', commandHandler(async (req, res, deviceConfig) => {
    const { status } = req.body;
    const result = await sendYealinkCommand(`audio set mute {"status":"${status}"}`, deviceConfig, true);
    res.json({ success: true, message: `Mute set to ${status}.`, ...result });
}));

app.post('/api/audio/pickup-channel-info', commandHandler(async (req, res, deviceConfig) => {
    const result = await sendYealinkCommand('audio get device-sound-channel-info', deviceConfig, true);
    res.json({ success: true, channelInfo: result.data, ...result });
}));

app.post('/api/audio/device-channel-active', commandHandler(async (req, res, deviceConfig) => {
    const result = await sendYealinkCommand('audio get device-sound-active-status', deviceConfig, true);
    res.json({ success: true, activeStatus: result.data, ...result });
}));

app.post('/api/audio/sound-source-location', commandHandler(async (req, res, deviceConfig) => {
    const result = await sendYealinkCommand('audio get device-sound-talker-position', deviceConfig, true);
    res.json({ success: true, locationData: result.data, ...result });
}));

app.post('/api/audio/set-gain', commandHandler(async (req, res, deviceConfig) => {
    const { arr_gain_info } = req.body;
    const result = await sendYealinkCommand(`audio set gain ${JSON.stringify({ arr_gain_info })}`, deviceConfig, true);
    res.json({ success: true, message: 'Set gain command sent.', ...result });
}));

app.post('/api/audio/get-gain', commandHandler(async (req, res, deviceConfig) => {
    const { arr_gain_info } = req.body;
    const result = await sendYealinkCommand(`audio get gain ${JSON.stringify({ arr_gain_info })}`, deviceConfig, true);
    res.json({ success: true, gainValues: result.data.arr_gain_info, ...result });
}));

app.post('/api/audio/get-preset-info', commandHandler(async (req, res, deviceConfig) => {
    const result = await sendYealinkCommand('audio get param-preset', deviceConfig, true);
    res.json({ success: true, presetInfo: result.data.preset_info || result.data, ...result });
}));

app.post('/api/audio/set-preset', commandHandler(async (req, res, deviceConfig) => {
    const { preset_id } = req.body;
    const result = await sendYealinkCommand(`audio set param-preset ${JSON.stringify({ preset_id })}`, deviceConfig, true);
    res.json({ success: true, message: `Set preset to '${preset_id}' command sent.`, ...result });
}));

app.post('/api/division/set-status', commandHandler(async (req, res, deviceConfig) => {
    const { value } = req.body;
    const result = await sendYealinkCommand(`division set status ${JSON.stringify({ value })}`, deviceConfig, true);
    res.json({ success: true, message: `Set division status to '${value}' command sent.`, ...result });
}));

app.post('/api/division/get-status', commandHandler(async (req, res, deviceConfig) => {
    const result = await sendYealinkCommand('division get status {}', deviceConfig, true);
    res.json({ success: true, statusValue: result.data.value, ...result });
}));


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`BACKEND: Yealink Control Backend listening at http://localhost:${PORT}`);
});