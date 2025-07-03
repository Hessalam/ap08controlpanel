document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://localhost:3000/api';

    // --- State Management ---
    let allDevices = [];
    let activeDevice = null;

    // --- DOM Elements ---
    // Views
    const setupView = document.getElementById('setup-view');
    const controlPanelView = document.getElementById('control-panel-view');

    // Setup View Elements
    const initialSaveDeviceButton = document.getElementById('initialSaveDeviceButton');
    const setupMessageArea = document.getElementById('setup-message-area');

    // Modal Elements
    const addDeviceModal = document.getElementById('add-device-modal');
    const modalSaveDeviceButton = document.getElementById('modalSaveDeviceButton');
    const modalCancelButton = document.getElementById('modalCancelButton');
    const modalMessageArea = document.getElementById('modal-message-area');

    // Device Menu Elements
    const menuButton = document.getElementById('menu-button');
    const deviceMenu = document.getElementById('device-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const deviceList = document.getElementById('device-list');
    const addNewDeviceBtn = document.getElementById('addNewDeviceBtn');

    // Main Panel Elements
    const activeDspDisplay = document.getElementById('active-dsp-display');
    const messageArea = document.getElementById('messageArea');
    const getMuteStatusButton = document.getElementById('getMuteStatusButton');
    const muteStatusSpan = document.getElementById('muteStatus');
    // ... (add all other control buttons and status displays here)
    const setSystemStatusButton = document.getElementById('setSystemStatusButton');
    const getHardwareInfoButton = document.getElementById('getHardwareInfoButton');
    const hardwareInfoStatus = document.getElementById('hardwareInfoStatus');
    const setMuteOnButton = document.getElementById('setMuteOnButton');
    const setMuteOffButton = document.getElementById('setMuteOffButton');
    const getPickupChannelInfoButton = document.getElementById('getPickupChannelInfoButton');
    const pickupChannelInfoStatus = document.getElementById('pickupChannelInfoStatus');
    const getDeviceChannelActiveButton = document.getElementById('getDeviceChannelActiveButton');
    const deviceChannelActiveStatus = document.getElementById('deviceChannelActiveStatus');
    const getSoundSourceLocationButton = document.getElementById('getSoundSourceLocationButton');
    const soundSourceLocationStatus = document.getElementById('soundSourceLocationStatus');
    const setChannelGainButton = document.getElementById('setChannelGainButton');
    const getChannelGainButton = document.getElementById('getChannelGainButton');
    const channelGainStatus = document.getElementById('channelGainStatus');
    const getPresetInfoButton = document.getElementById('getPresetInfoButton');
    const presetInfoStatus = document.getElementById('presetInfoStatus');
    const setPresetButton = document.getElementById('setPresetButton');
    const setDivisionStatusButton = document.getElementById('setDivisionStatusButton');
    const getDivisionStatusButton = document.getElementById('getDivisionStatusButton');
    const divisionStatus = document.getElementById('divisionStatus');
    const channelGainNameSet = document.getElementById('channelGainNameSet');
    const channelGainValueSet = document.getElementById('channelGainValueSet');
    const channelGainNameGet = document.getElementById('channelGainNameGet');

    // --- Helper Functions ---
    function displayMessage(message, type = 'info', area = messageArea) {
        area.textContent = message;
        area.className = `message ${type}`;
        area.style.display = 'block';
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (area.textContent === message) {
                    area.style.display = 'none';
                    area.textContent = '';
                    area.className = 'message';
                }
            }, 7000);
        }
    }

    async function apiCall(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };
            if (body) options.body = JSON.stringify(body);
            const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `API call failed with status ${response.status}`);
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    }

    async function callBackend(endpoint, method = 'POST', body = {}, isQuery = false) {
        if (!activeDevice) {
            displayMessage('Error: No active device selected.', 'error');
            return;
        }
        const loadingMessage = isQuery ? 'Fetching data...' : 'Sending command...';
        displayMessage(loadingMessage, 'info');
        try {
            const payload = { ...body, deviceConfig: activeDevice };
            const data = await apiCall(endpoint, method, payload);
            return data;
        } catch (error) {
            displayMessage(`Error: ${error.message}`, 'error');
            throw error;
        }
    }

    // --- Device Management ---
    async function fetchAndRenderDevices() {
        try {
            const data = await apiCall('/devices');
            allDevices = data.devices;
            if (allDevices.length === 0) {
                setupView.style.display = 'flex';
                controlPanelView.style.display = 'none';
            } else {
                setupView.style.display = 'none';
                controlPanelView.style.display = 'block';
                renderDeviceList();
                if (!activeDevice || !allDevices.find(d => d.id === activeDevice.id)) {
                    setActiveDevice(allDevices[0].id);
                } else {
                    setActiveDevice(activeDevice.id); // Re-select to update UI
                }
            }
        } catch (error) {
            // If we can't fetch devices (e.g., backend is down),
            // the only logical thing to do is show the setup screen.
            // Don't show an error, as the user might just need to start the server.
            console.error("Could not fetch devices on initial load. Defaulting to setup view.", error);
            setupView.style.display = 'flex';
            controlPanelView.style.display = 'none';
        }
    }

    function renderDeviceList() {
        deviceList.innerHTML = '';
        allDevices.forEach(device => {
            const li = document.createElement('li');
            li.dataset.deviceId = device.id;
            li.textContent = device.name;
            if (activeDevice && device.id === activeDevice.id) {
                li.classList.add('active');
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Delete Device';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete ${device.name}?`)) {
                    try {
                        await apiCall(`/devices/${device.id}`, 'DELETE');
                        displayMessage(`Device '${device.name}' deleted.`, 'success');
                        fetchAndRenderDevices();
                    } catch (error) {
                        displayMessage(`Error deleting device: ${error.message}`, 'error');
                    }
                }
            };

            li.appendChild(deleteBtn);
            li.onclick = () => setActiveDevice(device.id);
            deviceList.appendChild(li);
        });
    }

    function setActiveDevice(deviceId) {
        activeDevice = allDevices.find(d => d.id === deviceId);
        if (activeDevice) {
            activeDspDisplay.textContent = `Controlling: ${activeDevice.name} (${activeDevice.ip})`;
            renderDeviceList(); // Re-render to update 'active' class
            toggleMenu(false);
            // Automatically fetch status for the new device
            if (getMuteStatusButton) getMuteStatusButton.click();
            if (getDivisionStatusButton) getDivisionStatusButton.click();
        }
    }
    
    async function saveDevice(formPrefix) {
        const name = document.getElementById(`${formPrefix}_dspNameInput`).value.trim();
        const ip = document.getElementById(`${formPrefix}_dspIpInput`).value.trim();
        const port = document.getElementById(`${formPrefix}_dspPortInput`).value.trim();
        const username = document.getElementById(`${formPrefix}_dspUsernameInput`).value.trim();
        const password = document.getElementById(`${formPrefix}_dspPasswordInput`).value;
        const messageArea = formPrefix === 'setup' ? setupMessageArea : modalMessageArea;

        if (!name || !ip || !username) {
            displayMessage('Name, IP, and Username are required.', 'error', messageArea);
            return null;
        }

        try {
            const data = await apiCall('/devices', 'POST', { name, ip, port, username, password });
            displayMessage(data.message, 'success', messageArea);
            return data.device;
        } catch (error) {
            displayMessage(`Error: ${error.message}`, 'error', messageArea);
            return null;
        }
    }

    // --- Menu and Modal Logic ---
    function toggleMenu(forceState) {
        const isOpen = deviceMenu.classList.contains('open');
        const newState = typeof forceState === 'boolean' ? forceState : !isOpen;
        deviceMenu.classList.toggle('open', newState);
        menuOverlay.classList.toggle('visible', newState);
    }
    
    function showAddDeviceModal(show) {
        addDeviceModal.style.display = show ? 'flex' : 'none';
        if (show) {
            // Clear form fields when opening
            document.getElementById('modal_dspNameInput').value = '';
            document.getElementById('modal_dspIpInput').value = '';
            document.getElementById('modal_dspPortInput').value = '6024';
            document.getElementById('modal_dspUsernameInput').value = 'admin';
            document.getElementById('modal_dspPasswordInput').value = '';
            modalMessageArea.style.display = 'none';
        }
    }

    // --- Data Formatting Functions ---
    function formatHardwareInfo(data) {
        if (!data || !Array.isArray(data) || data.length === 0 || !data[0].status) return "No GPIO data or unexpected format.";
        const statusList = data[0].status;
        if (!Array.isArray(statusList) || statusList.length === 0) return "No GPIO status reported.";
        return statusList.map(item => `GPIO ${item.index}: ${item.status}`).join('\n');
    }
    function formatPickupChannelInfo(data) {
        if (!data) return "No data received.";
        const { max_channel_count, channel_enable } = data;
        const enabled = (channel_enable && channel_enable.length > 0) ? channel_enable.join(', ') : 'None';
        return `Max Channels: ${max_channel_count}\nEnabled Channels: [${enabled}]`;
    }
    function formatChannelActiveStatus(data) {
        if (!data || !data.active_status) return "No data received.";
        const active = (data.active_status.length > 0) ? data.active_status.join(', ') : 'None';
        return `Active Channels: [${active}]`;
    }
    function formatSoundSourceLocation(data) {
        if (!data || !data.doa) return "No data received.";
        const directions = (data.doa.length > 0) ? data.doa.join('°, ') + '°' : 'None detected';
        return `Direction of Arrival (DOA): ${directions}`;
    }
    function formatPresetInfo(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return "No preset information available.";
        return data.map(preset => `Name: ${preset.preset_name}\n  Type: ${preset.preset_type}\n  ID: ${preset.preset_id}`).join('\n\n');
    }
    function formatGainInfo(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return "No gain data or unexpected format.";
        return data.map(item => `${item.name}: ${item.value} dB`).join('\n');
    }
    function displayJsonResponse(element, dataObject) {
        if (dataObject && typeof dataObject === 'object') element.textContent = JSON.stringify(dataObject, null, 2);
        else if (typeof dataObject !== 'undefined') element.textContent = String(dataObject);
        else element.textContent = 'No data received or unexpected format.';
    }

    // --- UI Initialization ---
    function populateDropdowns() {
        const GAIN_CHANNELS = [...Array.from({ length: 16 }, (_, i) => `Dante-Input-${i + 1}`), 'Analog-Input-1', 'Analog-Input-2', 'RCA-Input-L', 'RCA-Input-R', 'USB-Input-1', 'USB-Input-2'];
        const GAIN_VALUES = Array.from({ length: 71 }, (_, i) => 10 - i);
        GAIN_CHANNELS.forEach(c => {
            channelGainNameSet.innerHTML += `<option value="${c}">${c}</option>`;
            channelGainNameGet.innerHTML += `<option value="${c}">${c}</option>`;
        });
        GAIN_VALUES.forEach(v => channelGainValueSet.innerHTML += `<option value="${v}">${v} dB</option>`);
    }

    // --- Event Listeners ---
    // Initial Setup
    initialSaveDeviceButton.addEventListener('click', async () => {
        const newDevice = await saveDevice('setup');
        if (newDevice) {
            setTimeout(fetchAndRenderDevices, 500);
        }
    });

    // Modal
    addNewDeviceBtn.addEventListener('click', () => showAddDeviceModal(true));
    modalCancelButton.addEventListener('click', () => showAddDeviceModal(false));
    modalSaveDeviceButton.addEventListener('click', async () => {
        const newDevice = await saveDevice('modal');
        if (newDevice) {
            showAddDeviceModal(false);
            await fetchAndRenderDevices();
            setActiveDevice(newDevice.id);
        }
    });

    // Menu
    menuButton.addEventListener('click', () => toggleMenu());
    menuOverlay.addEventListener('click', () => toggleMenu(false));

    // --- Command Buttons ---
    // Mute
    getMuteStatusButton.addEventListener('click', async () => {
        try {
            muteStatusSpan.textContent = 'Loading...';
            const data = await callBackend('/audio/mute-status', 'POST', {}, true);
            muteStatusSpan.textContent = data.status ? data.status.toUpperCase() : 'Error';
            displayMessage('Mute status updated.', 'success');
        } catch (error) { muteStatusSpan.textContent = 'Error'; }
    });
    setMuteOnButton.addEventListener('click', async () => {
        try {
            const data = await callBackend('/audio/set-mute', 'POST', { status: 'on' });
            displayMessage(data.message || 'Mute ON command sent.', 'success');
            getMuteStatusButton.click();
        } catch (error) {}
    });
    setMuteOffButton.addEventListener('click', async () => {
        try {
            const data = await callBackend('/audio/set-mute', 'POST', { status: 'off' });
            displayMessage(data.message || 'Mute OFF command sent.', 'success');
            getMuteStatusButton.click();
        } catch (error) {}
    });

    // System
    setSystemStatusButton.addEventListener('click', async () => {
        const status = document.getElementById('systemStatusSelect').value;
        const sn = document.getElementById('systemSnInput').value.trim();
        if ((status === "reset" && !confirm('DANGER: Are you sure you want to FACTORY RESET the device?')) ||
            (status === "reboot" && !confirm('Are you sure you want to REBOOT the device?'))) return;
        try {
            await callBackend('/system/set-status', 'POST', { status, sn });
            displayMessage(`Command '${status}' sent successfully.`, 'success');
        } catch (error) {}
    });

    getHardwareInfoButton.addEventListener('click', async () => {
        try {
            hardwareInfoStatus.textContent = 'Loading...';
            const payload = { hal_list: [{ type: "gpio", mode: "input", index: [1, 2] }] };
            const data = await callBackend('/system/get-hardware', 'POST', payload, true);
            hardwareInfoStatus.textContent = formatHardwareInfo(data.gpioData || data);
            displayMessage('Hardware info fetched.', 'success');
        } catch (error) { hardwareInfoStatus.textContent = 'Error fetching.'; }
    });

    // Other Audio
    getPickupChannelInfoButton.addEventListener('click', async () => {
        try {
            pickupChannelInfoStatus.textContent = 'Loading...';
            const data = await callBackend('/audio/pickup-channel-info', 'POST', {}, true);
            pickupChannelInfoStatus.textContent = formatPickupChannelInfo(data.channelInfo || data);
            displayMessage('Pickup channel info fetched.', 'success');
        } catch (error) { pickupChannelInfoStatus.textContent = 'Error fetching.'; }
    });
    getDeviceChannelActiveButton.addEventListener('click', async () => {
        try {
            deviceChannelActiveStatus.textContent = 'Loading...';
            const data = await callBackend('/audio/device-channel-active', 'POST', {}, true);
            deviceChannelActiveStatus.textContent = formatChannelActiveStatus(data.activeStatus || data);
            displayMessage('Device channel active status fetched.', 'success');
        } catch (error) { deviceChannelActiveStatus.textContent = 'Error fetching.';}
    });
    getSoundSourceLocationButton.addEventListener('click', async () => {
        try {
            soundSourceLocationStatus.textContent = 'Loading...';
            const data = await callBackend('/audio/sound-source-location', 'POST', {}, true);
            soundSourceLocationStatus.textContent = formatSoundSourceLocation(data.locationData || data);
            displayMessage('Sound source location fetched.', 'success');
        } catch (error) { soundSourceLocationStatus.textContent = 'Error fetching.';}
    });

    // Gain
    setChannelGainButton.addEventListener('click', async () => {
        const name = channelGainNameSet.value;
        const value = parseInt(channelGainValueSet.value, 10);
        try {
            await callBackend('/audio/set-gain', 'POST', { arr_gain_info: [{ name, value }] });
            displayMessage(`Set gain for ${name} successful.`, 'success');
        } catch (error) {}
    });
    getChannelGainButton.addEventListener('click', async () => {
        const name = channelGainNameGet.value;
        try {
            channelGainStatus.textContent = 'Loading...';
            const data = await callBackend('/audio/get-gain', 'POST', { arr_gain_info: [name] }, true);
            channelGainStatus.textContent = formatGainInfo(data.gainValues || data);
            displayMessage('Channel gain values fetched.', 'success');
        } catch (error) { channelGainStatus.textContent = 'Error fetching.'; }
    });

    // Presets
    getPresetInfoButton.addEventListener('click', async () => {
        try {
            presetInfoStatus.textContent = 'Loading...';
            const data = await callBackend('/audio/get-preset-info', 'POST', {}, true);
            presetInfoStatus.textContent = formatPresetInfo(data.presetInfo || data);
            displayMessage('Preset information fetched.', 'success');
        } catch (error) { presetInfoStatus.textContent = 'Error fetching.';}
    });
    setPresetButton.addEventListener('click', async () => {
        const preset_id = document.getElementById('presetIdSet').value.trim();
        if (!preset_id) {
            displayMessage('Preset ID is required.', 'error');
            return;
        }
        try {
            await callBackend('/audio/set-preset', 'POST', { preset_id });
            displayMessage(`Set preset to '${preset_id}' successful.`, 'success');
        } catch (error) {}
    });

    // Division
    getDivisionStatusButton.addEventListener('click', async () => {
        try {
            divisionStatus.textContent = 'Loading...';
            const data = await callBackend('/division/get-status', 'POST', {}, true);
            if (data.statusValue === 'unknown') {
                divisionStatus.textContent = 'Not Configured / Unknown';
                displayMessage(data.message, 'info');
            } else {
                divisionStatus.textContent = `${data.statusValue} (${data.statusValue === 0 ? 'Merged' : 'Divided'})`;
                displayMessage('Division status fetched.', 'success');
            }
        } catch (error) { divisionStatus.textContent = 'Error'; }
    });
    setDivisionStatusButton.addEventListener('click', async () => {
        const value = parseInt(document.getElementById('divisionStatusSelect').value, 10);
        try {
            await callBackend('/division/set-status', 'POST', { value });
            displayMessage(`Set division status to '${value === 0 ? 'Merged' : 'Divided'}' successful.`, 'success');
            getDivisionStatusButton.click();
        } catch (error) {}
    });

    // --- App Initialization ---
    populateDropdowns();
    fetchAndRenderDevices();
});