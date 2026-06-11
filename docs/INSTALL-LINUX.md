# Installing MyKeep on Linux

These steps set MyKeep up on a Linux machine — for example an Ubuntu home server. They take about fifteen
minutes, most of it just installing Docker the first time.

## What you'll need

- **Docker**, with its **Compose** feature. Docker is a free tool that runs an app in a tidy, self-contained
  package so you don't have to install anything else by hand. If you don't have it yet, follow Docker's
  official guide for your system: <https://docs.docker.com/engine/install/>. (Their install includes
  Compose, which the `docker compose` command below uses.)
- **Git**, for downloading the code. Most Linux systems already have it; if not, install it with your package
  manager — on Debian or Ubuntu that's `sudo apt install git`.
- A few minutes at a **terminal** on the machine that will host MyKeep.

## Get it running

**1. Get the code** onto the host machine and step into the folder:

```bash
git clone https://github.com/kbennett2000/my-keep.git
cd my-keep
```

**2. Create your settings file** by copying the example:

```bash
cp .env.example .env
```

**3. Set your secret.** MyKeep signs login cookies with a secret string. Generate a random one — this
command just prints a long, random value:

```bash
openssl rand -hex 32
```

Open `.env` in any text editor and paste what that printed as the value of `SESSION_SECRET`, so the line
looks like `SESSION_SECRET=3f9c...` (your value will be different). Save the file.

**4. Start it:**

```bash
docker compose up -d
```

The first run takes a minute or two while it builds — that's normal, and it only happens once.

**5. Open it.** On any device on the same network, go to your server's address on port **8065**:

```
http://YOUR-SERVER-IP:8065
```

(Replace `YOUR-SERVER-IP` with the host machine's address on your network. Not sure what it is? Run
`hostname -I` on the host — it prints something like `192.168.1.50`.)

**6. Make your account.** The first screen lets you register a username and password. That's it — **you're
running your own notes server.** 🎉

## What's next

- **See what you can do** → [Using MyKeep](USING-MYKEEP.md).
- **Everyday commands, backups, and changing the port** are in the [main README](../README.md).
