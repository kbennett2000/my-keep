# Installing MyKeep on Windows

This is the whole setup, start to finish, on a Windows PC. It takes about fifteen minutes — most of that is
just installing Docker the first time. You'll do a few steps at a command prompt, but every command is
written out for you to copy.

## Step 1 — Install Docker Desktop

**Docker** is a free tool that runs MyKeep in a tidy, self-contained package, so you don't have to install
anything else by hand. The Windows version is called **Docker Desktop**.

1. Download and install it from Docker's official guide:
   <https://docs.docker.com/desktop/setup/install/windows-install/>. The installer sets up everything it
   needs (it may ask to enable a Windows feature called WSL and restart — that's expected).
2. **Start Docker Desktop** and leave it running. You'll see a little **whale icon** in the system tray
   (bottom-right, near the clock) when it's ready. MyKeep needs Docker Desktop running, so keep it on.

## Step 2 — Install Git

**Git** is a free tool for downloading the code. Get it from <https://git-scm.com/download/win> and run the
installer (the default options are fine).

Git for Windows includes a terminal called **Git Bash** — a window where you type commands. We'll use it for
the rest of the steps, because its commands are the same ones Mac and Linux users run.

## Step 3 — Download MyKeep

Open **Git Bash** (find it in the Start menu). Then copy the code onto your PC and step into its folder:

```bash
git clone https://github.com/kbennett2000/my-keep.git
cd my-keep
```

## Step 4 — Create your settings file

Copy the example settings file:

```bash
cp .env.example .env
```

## Step 5 — Set your secret

MyKeep signs login cookies with a secret string. Generate a random one — this command just prints a long,
random value:

```bash
openssl rand -hex 32
```

Open the `.env` file in a text editor (Notepad is fine) and paste what that printed as the value of
`SESSION_SECRET`, so the line looks like `SESSION_SECRET=3f9c...` (your value will be different). Save the
file.

> Prefer **PowerShell** over Git Bash? You can generate a secret there with
> `-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })`, and copy the settings file
> with `Copy-Item .env.example .env`. The rest of the commands are the same.

## Step 6 — Start it

```bash
docker compose up -d
```

The first run takes a minute or two while it builds — that's normal, and it only happens once.

## Step 7 — Open it

**On this PC**, open a browser and go to:

```
http://localhost:8065
```

**From another device** (your phone, a laptop) on the same network, use this PC's network address followed
by `:8065`. To find that address, run `ipconfig` in your terminal and look for the **IPv4 Address** line —
it looks like `192.168.1.50`. Then visit `http://192.168.1.50:8065`.

## Step 8 — Make your account

The first screen lets you register a username and password. That's it — **you're running your own notes
server.** 🎉

## What's next

- **See what you can do** → [Using MyKeep](USING-MYKEEP.md).
- **Everyday commands, backups, and changing the port** are in the [main README](../README.md).
