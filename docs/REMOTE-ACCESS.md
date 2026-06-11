# Reaching MyKeep from anywhere

By default, MyKeep only answers on your home network — which is exactly what keeps it private. But maybe you
want your notes while you're at work or out for the day. You can have that **without** opening MyKeep up to
the whole internet, using a free tool called **Tailscale**.

## What's Tailscale?

**Tailscale** is a free app that builds a small, **private** network just for *your own* devices — your home
server, your laptop, your phone. Once they're all signed in, they can reach each other from anywhere, as if
they were sitting on the same home Wi-Fi.

The important part: this does **not** put MyKeep on the public internet. Only the devices you've added can
see it, and the connection between them is encrypted. It's the safe way to do what you wanted — reach your
own notes from away — without the risks of exposing the app to strangers.

## What you'll need

- A free **Tailscale** account (sign up in the next step — the free *Personal* plan is plenty for home use).
- About **ten minutes**.
- Access to two machines: the one **running MyKeep** (we'll call it the *host*), and the **phone or laptop**
  you want to use your notes on.

## Set it up

**1. Create a free account.** Go to [tailscale.com/download](https://tailscale.com/download) and sign up —
you can use a Google or Microsoft login, so there's nothing new to remember.

**2. Install Tailscale on the host** — the machine that runs MyKeep — and sign in. Tailscale's
[install guide](https://tailscale.com/kb/1017/install) has a button for every system. On an Ubuntu server,
it's one command:

```bash
sudo tailscale up
```

It'll print a link; open it in a browser, sign in, and the host joins your private network.

**3. Install Tailscale on your phone or laptop** — the device you'll use your notes on — and **sign in with
the same account**. (On a phone, it's an app from your app store; on a laptop, the same download page as
above.) This is what lets the two find each other.

**4. Find your host's Tailscale address.** Each device on your private network gets its own address that
looks like `100.x.y.z`. On the host, run:

```bash
tailscale ip -4
```

It prints the host's address — something like `100.101.102.103`. (You can also see all your devices and their
addresses on the Tailscale admin console in your browser.)

**5. Open your notes.** On your phone or laptop — anywhere with internet — go to that address with MyKeep's
port on the end:

```
http://100.101.102.103:8065
```

That's it. **Your notes, from anywhere — and still only yours.** 🎉

## A friendlier address (optional)

Typing `100.101.102.103` gets old. Tailscale has a feature called **MagicDNS** that lets you use the host's
**name** instead — so the address becomes something like `http://my-server:8065`. Turn it on from the admin
console; here's how: [MagicDNS](https://tailscale.com/kb/1081/magicdns).

## Want `https` in the address bar? (optional)

MyKeep itself serves plain `http`. If you'd like the padlock-style `https://` address, Tailscale can add one
for you with a feature called **Tailscale Serve** — it gives MyKeep a proper `https://…ts.net` web address on
your private network. It's a couple of extra commands and entirely optional:
[Tailscale Serve](https://tailscale.com/kb/1312/serve).

## Good to know

- **It's still private.** Only the devices you've added to your network can reach MyKeep. The open internet
  still can't — so the advice in the README stands: don't port-forward MyKeep or put it on a public address.
  Tailscale is the safe way to get the same convenience.
- **Free is enough.** The free *Personal* plan covers plenty of devices for a home setup. (See
  [pricing](https://tailscale.com/pricing) if you're curious.)

You've now got your own private notes server you can reach from anywhere — that's a genuinely nice thing to
have set up. Enjoy it.
