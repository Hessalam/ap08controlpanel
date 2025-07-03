# Yealink DSP Advanced Control Panel
**v0.9 - By Shane Venter / Nology (Pty) Ltd**

A modern, web-based control panel for managing one or more Yealink DSPs (such as the AP08) via a user-friendly interface. This application acts as a bridge, translating user actions in a web browser into Telnet commands for the DSP.

### Key Features (Updated from v0.6.1)
*   **Multi-Device Management:** No longer limited to a single device. Add, select, and delete multiple DSP configurations.
*   **Persistent Configuration:** Device settings are saved locally in the `data` folder, so your setup is remembered.
*   **User-Friendly Setup:** A guided first-time setup screen for new users.
*   **No More Hard-Coding:** All device connection details (IP, Port, Credentials) are managed through the UI, not by editing files.

---

### ⚠️ IMPORTANT: Disclaimer of Liability

This tool is provided for demonstration and testing purposes only. It is provided "as-is", without warranty of any kind, express or implied.

Any use of this tool in a live or production environment is strictly at the user's own risk. The author, Shane Venter, and Nology (Pty) Ltd shall not be held liable for any damages, including but not limited to, lost configurations, device malfunction, or devices rendered inoperable ("bricked").

It is strongly recommended to test this tool in a non-critical environment with a non-production device first.

---

### Prerequisites
*   [Node.js and npm](https://nodejs.org/en/download) (Node Package Manager) installed on your system.

### Installation
1.  Open a terminal (Command Prompt, PowerShell, or any other shell).
2.  Navigate to the project's root directory (the folder containing this README file).
3.  Run the following command **once** to install the necessary dependencies:
    ```bash
    npm install express cors
    ```

### Running the Application
The application consists of two parts that must be running: the backend server and the frontend interface.

1.  **Start the Backend Server:**
    In your terminal, from the project's root directory, run the following command:
    ```bash
    node telnet-handling-server.js
    ```
    The terminal will show that the server is listening, e.g., `BACKEND: Yealink Control Backend listening at http://localhost:3000`. Leave this terminal window running.

2.  **Open the Frontend Interface:**
    Open the `index.html` file in your preferred web browser (e.g., Chrome, Firefox, Edge).

### First-Time Use
On the first run, or if the `data` folder is empty, you will be prompted to configure your first DSP.
1.  Fill in the device's friendly name, IP address, Telnet port (default is 6024), and credentials.
2.  Click "Save and Continue".
3.  This will create your first device configuration file and take you to the main control panel.

### Usage
*   **Switching/Managing Devices:** Click the hamburger menu icon (☰) on the top-left to open the device management panel. From here, you can select a different DSP to control, add a new one using the modal window, or delete existing configurations.

---

### License and Copyright

Copyright © 2024 Nology (Pty) Ltd.

This software was developed by Shane Venter during his employment at Nology (Pty) Ltd. As such, any and all intellectual property rights pertaining to this software are owned by Nology (Pty) Ltd under South African law.

Portions of this software were generated with the assistance of AI tooling. While this may affect copyright eligibility for those specific portions under current legal interpretations, the software as a whole is provided under the license terms below.

**MIT License**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.