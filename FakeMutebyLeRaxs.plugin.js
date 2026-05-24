/**
 * @name แอบฟังอยู่นะจ้ะ
 * @author LeRaxs
 * @authorLink https://github.com/LeRaxs/FakeMute
 * @version 1.0.0
 * @description ฟังหรือพูดในห้องเสียงได้แม้จะแสดงว่าปิดเสียงอยู่
 * @website https://github.com/LeRaxs/FakeMute
 * @source https://github.com/LeRaxs/FakeMute/blob/main/FakeMute.plugin.js
 * @updateUrl https://raw.githubusercontent.com/leraxs001/BetterDiscord-FakeMute-by-LeRaxs/main/FakeMutebyLeRaxs.plugin.js
 */

module.exports = class FakeMuteByLeRaxs {
    constructor() {
        this.fixated = false;
        this.domButton = null;
        this.observer = null;
        this.retryCount = 0;
        this.maxRetries = 10;

        this.settings = {
            accountButton: true,
            sounds: true,
            domFallback: true
        };

        this.Sounds = {
            ENABLE: 'ptt_start',
            DISABLE: 'ptt_stop'
        };
    }

    getName() { return 'แอบฟังอยู่นะจ้ะ by LeRaxs'; }
    getAuthor() { return 'LeRaxs'; }
    getDescription() { return "ฟังหรือพูดในห้องเสียงได้แม้จะแสดงว่าปิดเสียงอยู่"; }
    getVersion() { return "1.0.0"; }

    load() {}

    start() {
        this.loadSettings();
        this.injectCSS();
        this.patchWebSocket();
        this.tryDOMMethod();
        this.setupDOMObserver();
        this.patchContextMenu();
        console.log('แอบฟังอยู่นะจ้ะ by LeRaxs: เริ่มทำงานแล้ว');
    }

    stop() {
        this.unpatchWebSocket();

        if (this.domButton && this.domButton.parentElement) {
            this.domButton.parentElement.removeChild(this.domButton);
        }

        if (this.observer) {
            this.observer.disconnect();
        }

        if (this.contextMenuPatch) {
            this.contextMenuPatch();
        }

        this.clearCSS();
        console.log('แอบฟังอยู่นะจ้ะ by LeRaxs: หยุดทำงานแล้ว');
    }

    loadSettings() {
        const saved = BdApi.Data.load(this.getName(), 'settings');
        if (saved) {
            this.settings = Object.assign(this.settings, saved);
        }
    }

    saveSettings() {
        BdApi.Data.save(this.getName(), 'settings', this.settings);
    }

    injectCSS() {
        const css = `
        .fake-mute-button-LeRaxs {
            min-width: 32px;
            height: 32px;
            background: none;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 4px;
            padding: 0 8px;
            color: var(--interactive-normal);
            transition: all 0.15s ease;
            box-sizing: border-box;
        }
        .fake-mute-button-LeRaxs:hover {
            background-color: var(--background-modifier-hover);
            color: var(--interactive-hover);
        }
        .fake-mute-button-LeRaxs.active {
            color: var(--status-danger);
            background-color: var(--status-danger-background);
        }
        .fake-mute-button-LeRaxs.active:hover {
            background-color: var(--status-danger-background);
            opacity: 0.8;
        }
        .fake-mute-button-LeRaxs svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        `;
        BdApi.DOM.addStyle(this.getName(), css);
    }

    clearCSS() {
        BdApi.DOM.removeStyle(this.getName());
    }

    setupDOMObserver() {
        this.observer = new MutationObserver(() => {
            if (!this.domButton || !document.contains(this.domButton)) {
                if (this.settings.domFallback && this.settings.accountButton) {
                    setTimeout(() => this.tryDOMMethod(), 500);
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    findButtonContainer() {
        return document.querySelector('[class*="voiceButtonsContainer"]');
    }

    tryDOMMethod() {
        if (this.domButton && document.contains(this.domButton)) return;

        const container = this.findButtonContainer();
        if (!container) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.tryDOMMethod(), 1000);
            }
            return;
        }

        this.domButton = this.createDOMButton();

        try {
            const firstChild = container.firstElementChild;
            if (firstChild) {
                container.insertBefore(this.domButton, firstChild);
            } else {
                container.appendChild(this.domButton);
            }
            console.log('แอบฟังอยู่นะจ้ะ by LeRaxs: ใส่ปุ่มลงใน voiceButtonsContainer แล้ว');
        } catch (e) {
            console.error('แอบฟังอยู่นะจ้ะ by LeRaxs: ไม่สามารถใส่ปุ่มได้', e);
        }
    }

    createDOMButton() {
        const button = document.createElement('button');
        button.className = 'fake-mute-button-LeRaxs';
        button.setAttribute('aria-label', `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen`);
        button.title = `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen`;

        if (this.fixated) button.classList.add('active');

        button.innerHTML = this.getSVGIcon();

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleFixate();
        });

        return button;
    }

    getSVGIcon() {
        return `<svg viewBox="0 0 20 20">
            <path fill="currentColor" d="${this.fixated
                ? 'M5.312 4.566C4.19 5.685-.715 12.681 3.523 16.918c4.236 4.238 11.23-.668 12.354-1.789c1.121-1.119-.335-4.395-3.252-7.312c-2.919-2.919-6.191-4.376-7.313-3.251zm9.264 9.59c-.332.328-2.895-.457-5.364-2.928c-2.467-2.469-3.256-5.033-2.924-5.363c.328-.332 2.894.457 5.36 2.926c2.471 2.467 3.258 5.033 2.928 5.365zm.858-8.174l1.904-1.906a.999.999 0 1 0-1.414-1.414L14.02 4.568a.999.999 0 1 0 1.414 1.414zM11.124 3.8a1 1 0 0 0 1.36-.388l1.087-1.926a1 1 0 0 0-1.748-.972L10.736 2.44a1 1 0 0 0 .388 1.36zm8.748 3.016a.999.999 0 0 0-1.36-.388l-1.94 1.061a1 1 0 1 0 .972 1.748l1.94-1.061a1 1 0 0 0 .388-1.36z'
                : 'M14.201 9.194c1.389 1.883 1.818 3.517 1.559 3.777c-.26.258-1.893-.17-3.778-1.559l-5.526 5.527c4.186 1.838 9.627-2.018 10.605-2.996c.925-.922.097-3.309-1.856-5.754l-1.004 1.005zM8.667 7.941c-1.099-1.658-1.431-3.023-1.194-3.26c.233-.234 1.6.096 3.257 1.197l1.023-1.025C9.489 3.179 7.358 2.519 6.496 3.384c-.928.926-4.448 5.877-3.231 9.957l5.402-5.4zm9.854-6.463a.999.999 0 0 0-1.414 0L1.478 17.108a.999.999 0 1 0 1.414 1.414l15.629-15.63a.999.999 0 0 0 0-1.414z'
            }"/>
        </svg>`;
    }

    updateDOMButton() {
        if (!this.domButton) return;
        this.domButton.innerHTML = this.getSVGIcon();
        this.domButton.title = `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen`;
        this.domButton.setAttribute('aria-label', `${this.fixated ? 'ปิด' : 'เปิด'} Fake Mute/Deafen`);
        if (this.fixated) {
            this.domButton.classList.add('active');
        } else {
            this.domButton.classList.remove('active');
        }
    }

    patchContextMenu() {
        this.contextMenuPatch = BdApi.ContextMenu.patch('audio-device-context', (tree) => {
            const menuItems = this.findMenuItems(tree);
            if (menuItems) {
                menuItems.push(
                    BdApi.ContextMenu.buildItem({ type: "separator" }),
                    BdApi.ContextMenu.buildItem({
                        type: "toggle",
                        label: "Fake Mute/Deafen โดย LeRaxs",
                        checked: this.fixated,
                        disabled: false,
                        action: () => this.toggleFixate()
                    })
                );
            }
        });
    }

    findMenuItems(tree) {
        if (Array.isArray(tree)) return tree;
        if (tree.props) {
            if (Array.isArray(tree.props.children)) return tree.props.children;
            if (tree.props.children) return this.findMenuItems(tree.props.children);
        }
        return null;
    }

    getVoiceState() {
        try {
            const VoiceStateStore = BdApi.Webpack.getStore("VoiceStateStore");
            const UserStore = BdApi.Webpack.getStore("UserStore");
            if (VoiceStateStore && UserStore) {
                const currentUser = UserStore.getCurrentUser();
                return VoiceStateStore.getVoiceStateForUser(currentUser.id);
            }
        } catch (e) {
            console.error('แอบฟังอยู่นะจ้ะ by LeRaxs: เกิดข้อผิดพลาด getVoiceState', e);
        }
        return null;
    }

    getVoiceChannelId() {
        try {
            const VoiceStateStore = BdApi.Webpack.getStore("VoiceStateStore");
            const UserStore = BdApi.Webpack.getStore("UserStore");
            if (VoiceStateStore && UserStore) {
                const user = UserStore.getCurrentUser();
                const state = VoiceStateStore.getVoiceStateForUser(user.id);
                if (state && state.channelId) return state.channelId;
            }
        } catch (e) {}

        try {
            const SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
            if (SelectedChannelStore && typeof SelectedChannelStore.getVoiceChannelId === 'function') {
                return SelectedChannelStore.getVoiceChannelId();
            }
        } catch (e) {}

        return null;
    }

    playSound(soundName) {
        try {
            const SoundModule = BdApi.Webpack.getByKeys("playSound");
            if (SoundModule && this.settings.sounds) {
                SoundModule.playSound(soundName, 0.4);
            }
        } catch (e) {
            console.error('แอบฟังอยู่นะจ้ะ by LeRaxs: เกิดข้อผิดพลาด playSound', e);
        }
    }

    showToast(message, type = 'info') {
        BdApi.UI.showToast(`[แอบฟังอยู่นะจ้ะ] ${message}`, { type });
    }

    toggleFixate(status = null) {
        if (!this.getVoiceChannelId()) {
            return this.showToast('เข้าห้องเสียงก่อนนะ!', 'error');
        }

        this.fixated = status === null ? !this.fixated : status;

        this.playSound(this.fixated ? this.Sounds.ENABLE : this.Sounds.DISABLE);
        this.updateDOMButton();

        if (this.fixated) {
            this.enableFakeMute();
        } else {
            this.disableFakeMute();
        }

        this.showToast(`Fake Mute/Deafen ${this.fixated ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว'}`, 'success');
    }

    patchWebSocket() {
        if (!WebSocket.prototype.fakeMuteLeRaxsOriginal) {
            WebSocket.prototype.fakeMuteLeRaxsOriginal = WebSocket.prototype.send;
        }
    }

    enableFakeMute() {
        const originalSend = WebSocket.prototype.fakeMuteLeRaxsOriginal;
        WebSocket.prototype.send = function(data) {
            try {
                if (typeof data === 'string') {
                    if (data.includes('"self_deaf"') || data.includes('"self_mute"')) return;
                } else if (data instanceof ArrayBuffer) {
                    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(data);
                    if (decoded.includes('self_deaf') || decoded.includes('self_mute')) return;
                }
            } catch (e) {}
            originalSend.call(this, data);
        };
    }

    disableFakeMute() {
        if (WebSocket.prototype.fakeMuteLeRaxsOriginal) {
            WebSocket.prototype.send = WebSocket.prototype.fakeMuteLeRaxsOriginal;
        }
    }

    unpatchWebSocket() {
        if (WebSocket.prototype.fakeMuteLeRaxsOriginal) {
            WebSocket.prototype.send = WebSocket.prototype.fakeMuteLeRaxsOriginal;
            delete WebSocket.prototype.fakeMuteLeRaxsOriginal;
        }
    }

    getSettingsPanel() {
        const panel = document.createElement('div');
        panel.style.padding = '10px';

        const createSetting = (id, name, note, value) => {
            const container = document.createElement('div');
            container.style.marginBottom = '20px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.marginBottom = '5px';

            const label = document.createElement('label');
            label.textContent = name;
            label.style.flex = '1';
            label.style.fontWeight = '500';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = value;
            toggle.style.width = '40px';
            toggle.style.height = '20px';

            toggle.addEventListener('change', (e) => {
                this.settings[id] = e.target.checked;
                this.saveSettings();
            });

            header.appendChild(label);
            header.appendChild(toggle);

            const noteEl = document.createElement('div');
            noteEl.textContent = note;
            noteEl.style.color = 'var(--text-muted)';
            noteEl.style.fontSize = '12px';

            container.appendChild(header);
            container.appendChild(noteEl);

            return container;
        };

        panel.appendChild(createSetting(
            'accountButton',
            'แสดงปุ่มเปิด/ปิด',
            'แสดงปุ่มข้างๆ ปุ่มตัดการเชื่อมต่อและลดเสียงรบกวน',
            this.settings.accountButton
        ));

        panel.appendChild(createSetting(
            'sounds',
            'เสียงเปิด/ปิด',
            'เล่นเสียงเมื่อเปิดหรือปิด Fake Mute/Deafen',
            this.settings.sounds
        ));

        panel.appendChild(createSetting(
            'domFallback',
            'Fallback DOM',
            'ใส่ปุ่มกลับเข้าไปใหม่ถ้า Discord ลบมันออก',
            this.settings.domFallback
        ));

        return panel;
    }
};
