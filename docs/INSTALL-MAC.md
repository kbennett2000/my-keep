# Installing MyKeep on a Mac

This is the whole setup, start to finish, on a Mac. It takes about fifteen minutes — most of that is just
installing Docker the first time. You'll do a few steps in the Terminal, but every command is written out
for you to copy.

## Step 1 — Install Docker Desktop

**Docker** is a free tool that runs MyKeep in a tidy, self-contained package, so you don't have to install
anything else by hand. The Mac version is called **Docker Desktop**.

1. Download and install it from Docker's official guide:
   <https://docs.docker.com/desktop/setup/install/mac-install/>. There are **two downloads** — one for
   **Apple silicon** and one for **Intel**. To see which you have, click the  menu (top-left) →
   *About This Mac*, and look at the **Chip** (Apple) or **Processor** (Intel) line.
2. **Open Docker Desktop** and leave it running. You'll see a little **whale icon** in the menu bar (top
   right) when it's ready. MyKeep needs Docker Desktop running, so keep it on.

## Step 2 — Open the Terminal

The **Terminal** is a Mac app where you type commands. Open it with **Spotlight**: press `Cmd + Space`, type
`Terminal`, and press Return. Keep this window open for the steps below.

## Step 3 — Install Git (if needed)

**Git** is a free tool for downloading the code. Many Macs already have it. Check by typing this in the
Terminal:

```bash
git --version
```

If Git isn't installed, your Mac will pop up an offer to install the **command-line developer tools** — click
**Install** and let it finish. (You can also download Git from <https://git-scm.com/download/mac>.)

## Step 4 — Download MyKeep

In the Terminal, copy the code onto your Mac and step into its folder:

```bash
git clone https://github.com/kbennett2000/my-keep.git
cd my-keep
```

## Step 5 — Create your settings file

Copy the example settings file:

```bash
cp .env.example .env
```

## Step 6 — Set your secret

MyKeep signs login cookies with a secret string. Generate a random one — this command just prints a long,
random value:

```bash
openssl rand -hex 32
```

Open the `.env` file in a text editor (`open -e .env` opens it in TextEdit) and paste what that printed as
the value of `SESSION_SECRET`, so the line looks like `SESSION_SECRET=3f9c...` (your value will be
different). Save the file.

## Step 7 — Start it

```bash
docker compose up -d
```

The first run takes a minute or two while it builds — that's normal, and it only happens once.

## Step 8 — Open it

**On this Mac**, open a browser and go to:

```
http://localhost:8065
```

**From another device** (your phone, a laptop) on the same network, use this Mac's network address followed
by `:8065`. To find that address, run `ipconfig getifaddr en0` in the Terminal (that's your Wi-Fi address) —
it looks like `192.168.1.50`. Then visit `http://192.168.1.50:8065`. (You can also find it under  menu →
*System Settings* → *Network*.)

## Step 9 — Make your account

The first screen lets you register a username and password. That's it — **you're running your own notes
server.** 🎉

## What's next

- **See what you can do** → [Using MyKeep](USING-MYKEEP.md).
- **Everyday commands, backups, and changing the port** are in the [main README](../README.md).
