# Scripts for Narrow One 🏹
> This repository contains JS scripts developed by Lumos to make playing [Narrow One](https://narrow.one) more fun and convenient.

To run these scripts, Tampermonkey (Google Chrome extension) is needed :
* have a look at this [guidline by N1CN](https://github.com/N1CNmod/narrowone-mod#how-to-run-the-scripts-step-by-step-guide)
* or [youtube vedio made by 【/ℕ𝕏/】 𝕶𝖛𝖊𝖝](https://www.youtube.com/watch?v=Cq7HAGtWuQ0)

## 📄 Chat Mod with Translation
Real-time translation and adaptive text color features considering the background to enhance your gameplay experience.

Deepest gratitude and honor to [Wolfart](https://github.com/N1-wolfart)..! I developed this by adding some features on original transparent chat UI mod created by [N1CNmod](https://github.com/N1CNmod/narrowone-mod).

![Chat Mod with Translation](chat_translator.png)

### Features

* Transparent Chat UI (Original): Replaces the bulky default chat box with a clean, transparent, and non-intrusive interface.
* **Adaptive Text Color:** The script reads the game background in real-time and automatically adjusts the chat text color (switching between dark and light modes with a subtle glow) to ensure maximum readability against any environment.
* **Two-Way Translation:** 
  * **Incoming Chat:** Translate messages from other players into your native language.
  * **Outgoing Chat:** Translate what you are typing into your friend's language instantly before sending.
* **Auto-Translation:** Automatically translates new incoming chat messages as they appear on the screen. (This can be toggled on/off in the settings).
* **No API Key Required:** Uses a lightweight Google Translate backend that works out of the box.

### How to Use (Keybinds)

* **`_` (Shift + `-`) - Open and Close Settings Menu**
  Press this to open the **✨ Chat Translator ✨** panel. Close it by pressing `_` again.
  
* **`-` (Minus) - Translate Chat Log**
  Press this outside of the chat input box to instantly translate all currently visible chat messages into your language. Press it again to revert the text back to the original messages.

* **`=` (Equals) - Translate Your Input**
  While typing a message in the chat input box, press `=` to instantly translate your typed text into your designated "Friend's Language."

### Settings Menu Overview

Press `_` in-game to access the configuration panel:

* **My language:** Set this to your native language. Incoming chat messages will be translated into this language.
* **My friend's language:** Set this to the language you want your outgoing messages to be translated into.
* **Adaptive text color:** Toggle the real-time contrast-aware text color engine.
* **Auto-translate new messages:** When enabled, any new message popping up in the chat log will be automatically translated to your language. (Disabled by default).

### Additional Licensing

This script is based on the work of N1CNmod.

The original source code remains the intellectual property of its original author.
All original copyright notices and attributions have been preserved.

The MIT License included in this repository applies only to the original code,
modifications, and additions created by me, Lumos. It does not replace,
override, or relicense any portion of the original author's work.

If you reuse this repository, please preserve both the original attribution and
the attribution for my modifications :)

## 📄 Adaptive Center Dot
Adds a centered dot to the screen for easier aiming.

### Features
* **Color Sync:** Synchronizes with your in-game crosshair's color and crosshair's outline color. 
