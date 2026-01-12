---
title: "State of the Homelab - Early 2026"
description: "A snapshot of the current state of my homelab."
featured: true
pubDate: "Jan 12 2026"
tags:
  - homelab
  - nixos
---

When I was a teenager I had a lot of fun on my computer. My best friend and I would run Counter Strike: Source game servers -- we had a great time learning how to install mods onto the server, playing with friends and strangers, and using (definitely not abusing...) the “slap”, "burn", and "slay" admin commands.

I turned 30 last year and after doing some reflection, I realized that over the past decade or so I wasn’t having fun on my computer. I was simply using my computer as a tool to earn a decent paycheck. Don't get me wrong -- I love programming, but at a certain point getting on the computer felt more like punching in and out as opposed to something to do for fun.

At the same time I was also feeling fed up with the algorithmic slop being served up on all my feeds, the [enshitification of services](https://github.com/orgs/community/discussions/183775) I rely on, and being the product of social media companies. I decided that it was time to try to make a change.

I had an idea of what the homelab community was about and had heard about some of the more popular self hosted services (Jellyfin, Immich, and others) and decided that starting my own lab could be a nice way to start having fun on my computer again. 

And I have been having fun!

This post largely serves as a re-introduction to blogging for myself -- as the last post on my blog was published almost 7 years ago... I'm hoping to keep up the habit this year. I think this post is a good way to snapshot the current state of my homelab and see how it evolves over the coming year(s).

# The Hardware

`liveoak` server:

| Component     | Model                                           |
| ------------- | ----------------------------------------------- |
| CPU           | Intel i5 12500                                  |
| Motherboard   | ASRock Z690M-ITX/ax                             |
| Memory        | 32GB (2x16) Corsair Vengeance DDR4 3600MHz CL18 |
| PSU           | Corsair RM850 Gold ATX                          |
| CPU Cooler    | Noctua NH-U12S                                  |
| Storage (SSD) | 1TB Kingston NV2 M.2 NVMe                       |
| Storage (HDD) | 2x 8TB Seagate Ironwolf NAS Drive               |
| Case          | Fractal Design Define Nano S                    |

The parts are nothing special -- just consumer grade hardware that I managed to find deals for on Ebay, Facebook Marketplace, and Jawa. I chose the 12th gen Intel platform since it is compatible with DDR4 and DDR5 memory. With the recent inflation of price in DDR5 memory I thought it would be better to buy some DDR4 sticks now and think about upgrading later. The i5 12500 is in a sweet spot since its the lowest tier processor with the UHD 770 integrated GPU (which I plan to use for transcoding) and isn't too expensive on the used market.

The only component I purchased new was the motherboard; it was surprisingly hard to find a fairly priced m-itx motherboard with a good feature set on the used market. I ended up getting a last generation model with the high tier "z" chipset -- which lets you overclock the CPU and memory, although I plan to do neither. The motherboard I chose has dual network interfaces, a gigabit and 2.5 gigabit interface. Unfortunately, the 2.5 gigabit interface is a "Dragon" brand though we do get an Intel gigabit interface.

One thing I really like about this build is the case -- the [Fractal Design Define Nano S](https://www.fractal-design.com/products/cases/define/define-nano-s/). This was a surprisingly comfy case to build in for the m-itx form factor. The case is pretty flexible in its layout -- supporting up to 4 drives, AIO mounting, and additional fans. What I like the most about the case is that I previously used its big brother, the Fractal Define full size variant, in my build from my sophomore year of college to post-grad. It's funny to now have the "mini-me" version of that case -- on which I spent lots of time playing games and bashing my head against upper division programming assignments. One thing I disliked about the case when I previously owned it was a blindingly-bright blue power LED on the case, however, the previous owner of this one had replaced the LED with a calming green one -- nice!

# The Software

`liveoak` is running NixOS which I manage with the [clan.lol](https://clan.lol) deployment framework. Clan is a really powerful tool and I plan to write more about how I'm using it to manage both my personal computers and the VMs that run my small business. The clan project is totally aligned with why I decided to get into homelab in the first place -- I want ownership of my compute and data.

I'm using Tailscale to expose [services](https://tailscale.com/kb/1552/tailscale-services) running on the `liveoak` server. It was easy to write a nix module to set them up with systemd oneshot scripts. Before using Tailscale Services I achieved similar functionality using the Tailscale [experimental Caddy plugin](https://github.com/tailscale/caddy-tailscale) . I liked the flexibility of having control over the Caddy configuration, but shoving all that responsibility over to `tailscaled` is cool too. For now, I'm liking the simplicity of using Tailscale to pass its auth headers around to the services. For now, only my girlfriend and I need access to the server so my ACL and authz needs aren't too complex.

The services currently running on `liveoak`:

| Service Name                                    | Usage                                      |
| ----------------------------------------------- | ------------------------------------------ |
| [linkding](https://linkding.link)               | Bookmarks and link aggregation             |
| [feedlynx](https://github.com/wezm/feedlynx)    | Read Later aggregation into my RSS reader  |
| [forgejo](https://forgejo.org)                  | Git backup for my personal repos           |
| [home-assistant](https://www.home-assistant.io) | Local home automation                      |
| [jellyfin](https://jellyfin.org)                | Streaming media I own to my client devices |
| [miniflux](https://miniflux.app)                | RSS reader                                 |
| [copyparty](https://copyparty.eu)               | File storage/server                        |
| [authentik](https://goauthentik.io)             | SSO into Tailscale                         |

# Planned Improvements

As most other software engineers, I feel the constant need to tinker with my computer.

Immediately on my TODO list is to figure out an IP KVM (a-la JetKVM or NanoKVM) to make maintenance easier. The server runs headless, however, I do have to enter my LUKS key to decrypt the drives after a reboot. It would be nice to have a website I can hit from my primary machine instead of shuffling to plug in the spare keyboard into the server. 

I plan to upgrade my router at some point. I’m currently using a modem/router from my ISP that does not support VLANs which is the main feature I want from a more sophisticated router. I have a small collection of home IoT devices, although, I am starting to phase out the WiFi ones in favor of Zigbee -- so the number of IoT devices I want to silo off on their own VLAN is steadily decreasing.

I'm sure there will be more services I'm running as I continue finding self hosted alternatives / tools that I find useful. 

I'm looking forward to sharing the end of year update :)
