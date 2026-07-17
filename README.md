# Narrow.One - Adaptive Chat Translator & UI Mod

This script is an extended version of the original transparent chat UI mod created by N1CNmod (wolfart), adding real-time translation and adaptive text color features to enhance your gameplay experience. 

## ✨ Features

* **Transparent Chat UI (Original):** Replaces the bulky default chat box with a clean, transparent, and non-intrusive interface.
* **Adaptive Text Color:** The script reads the game background in real-time and automatically adjusts the chat text color (switching between dark and light modes with a subtle glow) to ensure maximum readability against any environment.
* **Two-Way Translation:** 
  * **Incoming Chat:** Translate messages from other players into your native language.
  * **Outgoing Chat:** Translate what you are typing into your friend's language instantly before sending.
* **Auto-Translation:** Automatically translates new incoming chat messages as they appear on the screen. (This can be toggled on/off in the settings).
* **No API Key Required:** Uses a lightweight Google Translate backend that works out of the box.

## 🚀 Installation

1. Install a userscript manager extension like **Tampermonkey** for your browser.
2. Create a new script in the extension.
3. Copy the entire provided `.user.js` code and paste it into the editor, replacing any default code.
4. Save the script (Ctrl+S / Cmd+S).
5. Refresh your Narrow.One game tab. The script will automatically inject when the game loads.

## ⌨️ How to Use (Keybinds)

The script operates primarily through three simple hotkeys:

* **`_` (Shift + `-`) - Open Settings Menu**
  Press this to open the **✨ Chat Translator ✨** panel. You can drag the panel around by clicking its header. Close it by pressing `_` again.
  
* **`-` (Minus) - Translate Chat Log**
  Press this outside of the chat input box to instantly translate all currently visible chat messages into your language. Press it again to revert the text back to the original messages.

* **`=` (Equals) - Translate Your Input**
  While typing a message in the chat input box, press `=` to instantly translate your typed text into your designated "Friend's Language."

## ⚙️ Settings Menu Overview

Press `_` in-game to access the configuration panel:

* **My language:** Set this to your native language. Incoming chat messages will be translated into this language.
* **My friend's language:** Set this to the language you want your outgoing messages to be translated into.
* **Adaptive text color:** Toggle the real-time contrast-aware text color engine.
* **Auto-translate new messages:** When enabled, any new message popping up in the chat log will be automatically translated to your language. (Disabled by default).

## 📝 Notes

* **Translation Indicator:** A small "Translating..." bubble will appear at the bottom center of your screen to let you know when the backend is processing your request. 
* **Message Tooltips:** If you translate a chat log, hovering your mouse over the translated message will display the original text and the detected language.
