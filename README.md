# IgnoreCalls

> **Stop unwanted Discord calls before they interrupt you.**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-BetterDiscord-7289DA.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Settings Panel](#settings-panel)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Why This Exists

You know that one friend. The one who calls at 2 AM. The one who calls five times in a row when you don't pick up. The one who calls while you're in the middle of a game, a meeting, or just trying to exist in peace.

Discord doesn't let you silence calls from specific people — it's all or nothing. You either accept all incoming calls with full sound and notification, or you go into Do Not Disturb mode and miss calls from everyone else.

**IgnoreCalls** fills that gap. It lets you silently ignore calls from specific users while staying fully reachable to everyone else. No sound. No pop-up. No interruption. They'll never know their call didn't go through — and you can keep your sanity intact.

---

## Features

- 🔕 **Selective call blocking** — block calls from specific users without affecting anyone else
- 🖱️ **Right-click to ignore** — right-click any user and select "Ignore calls from [name]" — done
- 🔇 **Fully silent** — no notification, no ringtone, no pop-up when a blocked user calls
- 📋 **Managed ignore list** — view and remove ignored users from the BetterDiscord settings panel
- 🛠️ **Diagnostic mode** — toggle a debug log on/off to troubleshoot if something isn't working
- ⚡ **Lightweight** — no performance impact, runs quietly in the background

---

## Prerequisites

### What you need

| Requirement | Version | Notes |
|-------------|---------|-------|
| Discord Desktop | Latest | The browser version is not supported |
| BetterDiscord | Latest | See below |

### What is BetterDiscord?

BetterDiscord is a free, open-source modification of the Discord desktop app. It adds a plugin system and theme support that Discord doesn't offer natively. Plugins like IgnoreCalls are `.js` files that you drop into a folder — no coding required to use them.

BetterDiscord has been around since 2015 and is used by millions of people. It works by patching the Discord desktop client locally on your machine.

**Official website:** [https://betterdiscord.app](https://betterdiscord.app)

> ⚠️ BetterDiscord is not affiliated with Discord Inc. See the [Disclaimer](#disclaimer) section before installing.

---

## Installation

### Step 1 — Install BetterDiscord

1. Go to [https://betterdiscord.app](https://betterdiscord.app)
2. Click **Download**
3. Run the installer and follow the on-screen steps
4. Select your Discord installation when prompted
5. Restart Discord — you should now see a **BetterDiscord** section in your settings


### Step 2 — Download IgnoreCalls

Download the plugin file:

**[⬇️ Download IgnoreCalls.plugin.js](https://github.com/conecta6/IgnoreCalls/releases/latest)**

You will get a single file: `IgnoreCalls.plugin.js`

### Step 3 — Copy the file to your plugins folder

Open your plugins folder. The easiest way is to paste this path into Windows Explorer's address bar:

```
%AppData%\BetterDiscord\plugins\
```

Then copy `IgnoreCalls.plugin.js` into that folder.

> **Full path example:** `C:\Users\YourName\AppData\Roaming\BetterDiscord\plugins\IgnoreCalls.plugin.js`


### Step 4 — Enable the plugin in Discord

1. Open Discord
2. Go to **User Settings** (the gear icon ⚙️ at the bottom left)
3. Scroll down to **BetterDiscord → Plugins**
4. Find **IgnoreCalls** in the list
5. Toggle it **ON**


That's it. IgnoreCalls is now active.

---

## Usage

### Ignoring a user's calls

1. Right-click on the user's name anywhere in Discord (friend list, server member list, DMs)
2. Click **"Ignore calls from [username]"**


From that point on, if that user calls you, you won't hear or see anything. The call will appear to ring on their end as normal.

### Removing someone from the ignore list

You have two options:

**Option A — Right-click menu:**
Right-click the user again. The option will now read **"Stop ignoring calls from [username]"**. Click it to remove them.

**Option B — Settings panel:**
Open the IgnoreCalls settings panel (see below) and remove them from the list there.

---

## Settings Panel

Access the settings by going to **Discord Settings → BetterDiscord → Plugins → IgnoreCalls → Settings**.

The panel contains:

| Setting | Description |
|---------|-------------|
| **Ignored Users** | A list of all users currently being ignored. Each entry shows the username and a Remove button. |
| **Diagnostic Mode** | Toggle ON to enable a debug console log. Useful if calls are not being blocked as expected. Toggle OFF when you're done troubleshooting. |


---

## Disclaimer

**IgnoreCalls** is a BetterDiscord plugin. BetterDiscord modifies the Discord desktop client, which may technically be in conflict with [Discord's Terms of Service](https://discord.com/terms).

**What this means in practice:**

- Discord has historically tolerated BetterDiscord for personal, non-commercial use
- There are no known cases of accounts being banned specifically for using BetterDiscord
- You use this plugin at your own discretion and risk

This project is not affiliated with, endorsed by, or sponsored by Discord Inc. or BetterDiscord.

---

## License

MIT License

Copyright (c) 2026 IgnoreCalls Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---
---
---

# IgnoreCalls

> **Para de recibir llamadas no deseadas de Discord antes de que te interrumpan.**

![Versión](https://img.shields.io/badge/versión-1.0.0-blue.svg)
![Plataforma](https://img.shields.io/badge/plataforma-BetterDiscord-7289DA.svg)
![Licencia](https://img.shields.io/badge/licencia-MIT-green.svg)

---

## Tabla de contenidos

- [Por qué existe esto](#por-qué-existe-esto)
- [Características](#características)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Panel de ajustes](#panel-de-ajustes)
- [Aviso legal](#aviso-legal)
- [Licencia](#licencia)

---

## Por qué existe esto

Todos tenemos ese amigo. El que llama a las 2 de la mañana. El que llama cinco veces seguidas cuando no contestas. El que te llama justo cuando estás en medio de una partida, una reunión, o simplemente intentando existir en paz.

Discord no te deja silenciar las llamadas de personas concretas: es todo o nada. O aceptas todas las llamadas con sonido y notificación, o activas el modo No Molestar y te pierdes las llamadas de todos los demás.

**IgnoreCalls** llena ese hueco. Te permite ignorar silenciosamente las llamadas de usuarios específicos sin dejar de estar disponible para el resto. Sin sonido. Sin ventana emergente. Sin interrupción. La otra persona creerá que su llamada está sonando con normalidad, y tú podrás seguir con tu vida.

---

## Características

- 🔕 **Bloqueo selectivo de llamadas** — bloquea las llamadas de usuarios concretos sin afectar al resto
- 🖱️ **Click derecho para ignorar** — haz click derecho en cualquier usuario y selecciona "Ignorar llamadas de [nombre]" — listo
- 🔇 **Totalmente silencioso** — ninguna notificación, ningún tono de llamada, ninguna ventana emergente cuando un usuario bloqueado te llama
- 📋 **Lista de ignorados gestionable** — consulta y elimina usuarios ignorados desde el panel de ajustes de BetterDiscord
- 🛠️ **Modo diagnóstico** — activa o desactiva un registro de depuración para resolver problemas si algo no funciona correctamente
- ⚡ **Ligero** — sin impacto en el rendimiento, funciona en segundo plano sin que lo notes

---

## Requisitos previos

### Qué necesitas

| Requisito | Versión | Notas |
|-----------|---------|-------|
| Discord Escritorio | Última | La versión de navegador no está soportada |
| BetterDiscord | Última | Ver más abajo |

### ¿Qué es BetterDiscord?

BetterDiscord es una modificación gratuita y de código abierto de la aplicación de escritorio de Discord. Añade un sistema de plugins y soporte para temas que Discord no ofrece de forma nativa. Los plugins como IgnoreCalls son archivos `.js` que simplemente copias en una carpeta — no necesitas saber programar para usarlos.

BetterDiscord existe desde 2015 y lo usan millones de personas. Funciona modificando el cliente de escritorio de Discord localmente en tu ordenador.

**Sitio web oficial:** [https://betterdiscord.app](https://betterdiscord.app)

> ⚠️ BetterDiscord no está afiliado con Discord Inc. Consulta la sección [Aviso legal](#aviso-legal) antes de instalar.

---

## Instalación

### Paso 1 — Instalar BetterDiscord

1. Ve a [https://betterdiscord.app](https://betterdiscord.app)
2. Haz click en **Download**
3. Ejecuta el instalador y sigue los pasos en pantalla
4. Selecciona tu instalación de Discord cuando se te pida
5. Reinicia Discord — ahora deberías ver una sección **BetterDiscord** en tus ajustes


### Paso 2 — Descargar IgnoreCalls

Descarga el archivo del plugin:

**[⬇️ Descargar IgnoreCalls.plugin.js](https://github.com/conecta6/IgnoreCalls/releases/latest)**

Obtendrás un único archivo: `IgnoreCalls.plugin.js`

### Paso 3 — Copiar el archivo a la carpeta de plugins

Abre tu carpeta de plugins. La forma más sencilla es pegar esta ruta en la barra de direcciones del Explorador de Windows:

```
%AppData%\BetterDiscord\plugins\
```

Luego copia `IgnoreCalls.plugin.js` dentro de esa carpeta.

> **Ruta completa de ejemplo:** `C:\Users\TuNombre\AppData\Roaming\BetterDiscord\plugins\IgnoreCalls.plugin.js`


### Paso 4 — Activar el plugin en Discord

1. Abre Discord
2. Ve a **Ajustes de usuario** (el icono de engranaje ⚙️ en la parte inferior izquierda)
3. Desplázate hacia abajo hasta **BetterDiscord → Plugins**
4. Busca **IgnoreCalls** en la lista
5. Actívalo con el interruptor


Eso es todo. IgnoreCalls ya está activo.

---

## Uso

### Ignorar las llamadas de un usuario

1. Haz click derecho sobre el nombre del usuario en cualquier lugar de Discord (lista de amigos, lista de miembros de un servidor, mensajes directos)
2. Haz click en **"Ignorar llamadas de [nombre de usuario]"**


A partir de ese momento, si ese usuario te llama, no escucharás ni verás nada. En el lado del que llama, la llamada parecerá estar sonando con normalidad.

### Quitar a alguien de la lista de ignorados

Tienes dos opciones:

**Opción A — Menú de click derecho:**
Haz click derecho sobre el usuario de nuevo. La opción ahora mostrará **"Dejar de ignorar llamadas de [nombre de usuario]"**. Haz click para eliminarlo.

**Opción B — Panel de ajustes:**
Abre el panel de ajustes de IgnoreCalls (ver más abajo) y elimínalo desde la lista.

---

## Panel de ajustes

Accede a los ajustes desde **Ajustes de Discord → BetterDiscord → Plugins → IgnoreCalls → Ajustes**.

El panel contiene:

| Ajuste | Descripción |
|--------|-------------|
| **Usuarios ignorados** | Una lista con todos los usuarios que están siendo ignorados actualmente. Cada entrada muestra el nombre de usuario y un botón para eliminarlo. |
| **Modo diagnóstico** | Actívalo para habilitar un registro de depuración en la consola. Útil si las llamadas no se están bloqueando como se esperaba. Desactívalo cuando hayas terminado de depurar. |


---

## Aviso legal

**IgnoreCalls** es un plugin de BetterDiscord. BetterDiscord modifica el cliente de escritorio de Discord, lo cual puede estar técnicamente en conflicto con los [Términos de servicio de Discord](https://discord.com/terms).

**Lo que esto significa en la práctica:**

- Discord ha tolerado históricamente BetterDiscord para uso personal y no comercial
- No se conocen casos de cuentas baneadas específicamente por usar BetterDiscord
- Usas este plugin bajo tu propia discreción y responsabilidad

Este proyecto no está afiliado, respaldado ni patrocinado por Discord Inc. ni por BetterDiscord.

---

## Licencia

Licencia MIT

Copyright (c) 2026 Contribuidores de IgnoreCalls

Por la presente se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y los archivos de documentación asociados (el "Software"), para utilizar el Software sin restricciones, incluyendo sin limitación los derechos de usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del Software, y para permitir a las personas a quienes se les proporcione el Software que lo hagan, sujeto a las siguientes condiciones:

El aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.

EL SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUYENDO PERO NO LIMITADO A LAS GARANTÍAS DE COMERCIABILIDAD, IDONEIDAD PARA UN PROPÓSITO PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS AUTORES O TITULARES DE LOS DERECHOS DE AUTOR SERÁN RESPONSABLES DE NINGUNA RECLAMACIÓN, DAÑO U OTRA RESPONSABILIDAD, YA SEA EN UNA ACCIÓN CONTRACTUAL, EXTRACONTRACTUAL O DE OTRO TIPO, QUE SURJA DE O EN CONEXIÓN CON EL SOFTWARE O EL USO U OTROS TRATOS EN EL SOFTWARE.
