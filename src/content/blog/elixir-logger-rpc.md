---
title: "changeme"
description: "changeme"
featured: false
pubDate: "Jul 28 2024"
planned: true
tags:
  - elixir
---

## Intro

What do Elixir's `Logger`, mix releases, and Erlang distribution have in common? More than is immediately obvious at first glance.

Imagine that you just received a request to standardize the logging format of an Elixir microservice you are the owner of. "Easy enough" you say to yourself, "we can apply custom formatting on all log messages by [configuring the default handler on Logger](https://hexdocs.pm/logger/1.17.3/Logger.html#module-boot-configuration).

You add the config for the formatting:

```
config :logger, :default_formatter,
  ...
```

You add a test that the formatting works:

```elixir
deftest "..." do
end
```

Everything looks good in local testing. You deploy the application to a development environment and check the logs:

```
correct format log
correct format log
wrong format log
```

Looks goo...wait how is that possible? We configured the "default formatter"! Why wouldn't that format all of the logs?

## Let's Build a Release

Elixir applications are typically built for production with [Mix releases](https://hexdocs.pm/mix/Mix.Tasks.Release.html#module-why-releases). When a release is built, the toolchain creates a shell script which wraps commands to start and interact with the BEAM:

```sh
mix release
Compiling 1 file (.ex)

Release created at _build/dev/rel/logging

    # To start your system
    _build/dev/rel/logging/bin/logging start

Once the release is running:

    # To connect to it remotely
    _build/dev/rel/logging/bin/logging remote

    # To stop it gracefully (you may also send SIGINT/SIGTERM)
    _build/dev/rel/logging/bin/logging stop

To list all commands:

    _build/dev/rel/logging/bin/logging
```

The output tells us know what commands we can use to start, stop, and connect to a release. How are those commands actually implemented? Let's take a look inside the script, which I've shortened for brevity.

```sh
#!/bin/sh
set -e

rpc () {
  exec "$REL_VSN_DIR/elixir" \
       --hidden --cookie "$RELEASE_COOKIE" \
       $(release_distribution "rpc-$(rand)-$RELEASE_NODE") \
       --boot "$REL_VSN_DIR/$RELEASE_BOOT_SCRIPT_CLEAN" \
       --boot-var RELEASE_LIB "$RELEASE_ROOT/lib" \
       --vm-args "$RELEASE_REMOTE_VM_ARGS" \
       --rpc-eval "$RELEASE_NODE" "$1"
}

start () {
  export_release_sys_config
  REL_EXEC="$1"
  shift
  exec "$REL_VSN_DIR/$REL_EXEC" \
       --cookie "$RELEASE_COOKIE" \
       $(release_distribution "$RELEASE_NODE") \
       --erl "-mode $RELEASE_MODE" \
       --erl-config "$RELEASE_SYS_CONFIG" \
       --boot "$REL_VSN_DIR/$RELEASE_BOOT_SCRIPT" \
       --boot-var RELEASE_LIB "$RELEASE_ROOT/lib" \
       --vm-args "$RELEASE_VM_ARGS" "$@"
}

case $1 in
  start)
    start "elixir" --no-halt
    ;;

  remote)
    exec "$REL_VSN_DIR/iex" \
         --werl --hidden --cookie "$RELEASE_COOKIE" \
         $(release_distribution "rem-$(rand)-$RELEASE_NODE") \
         --boot "$REL_VSN_DIR/$RELEASE_BOOT_SCRIPT_CLEAN" \
         --boot-var RELEASE_LIB "$RELEASE_ROOT/lib" \
         --vm-args "$RELEASE_REMOTE_VM_ARGS" \
         --remsh "$RELEASE_NODE"
    ;;

  rpc)
    if [ -z "$2" ]; then
      echo "ERROR: RPC expects an expression as argument" >&2
      exit 1
    fi
    rpc "$2"
    ;;
esac
```

At first glance, it appears as if the commands to start the release, open a remote shell, or execute an RPC call into the running system are all very similar. However, notice that in both the implementations of the `remote` and `rpc` the `--hidden` flag is included in the arguments which are eventually passed to the BEAM startup.

From the Erlang documentation:

> A hidden node is a node started with the command-line flag -hidden. Connections between hidden nodes and other nodes are not transitive, they must be set up explicitly. Also, hidden nodes does not show up in the list of nodes returned by nodes/0. Instead, nodes(hidden) or nodes(connected) must be used. This means, for example, that the hidden node is not added to the set of nodes that global is keeping track of.

This is pretty interesting! When we `remote` into a running release our shell is actually running in a new Erlang node connected to the primary node. However, the primary node can't see the remote node (by default, we can access it with a flag passed on `Node.list/1`.

Okay great, but what does this have to do with the log formatting? Well, if we check the output of `:logger.get_handler_config(:default)` we can see there is a filter applied to logs coming from remote nodes:

```
iex(5)> :logger.get_handler_config(:default) |> then(fn {:ok, handler} -> handler.filters end)
[remote_gl: {&:logger_filters.remote_gl/2, :stop}]

iex(6)> h :logger_filters.remote_gl/2

                          :logger_filters.remote_gl/2


  -spec remote_gl(LogEvent, Extra) -> logger:filter_return()
                     when
                         LogEvent :: logger:log_event(),
                         Extra :: log | stop.

Since:
  OTP 21.0

  This filter matches all events originating from a process that has its group leader on a remote node.

  If Extra is log, the matching events are allowed. If Extra is stop, the matching events are stopped.

  The filter returns ignore for all other log events.
```

This config usually makes sense! When you are connected to a release with `remote` you usually want the logs of whatever commands to be output to your interactive shell instead of wherever the system is configured to send them. However, in our case its causing the inconsistent log formatting.

Any logs which are being generated by processes which are started on the primary application's supervision tree will have the proper logging format. However, any logs generated by the `my_app/bin/my_app rpc LiveStream.run(...)` call will appear to be coming from a remote node and thus the `:logger_filter.remote_gl/2` filter will not pick up the logs and apply the formatting we set for the `:default` handler.
