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

What do Elixir's `Logger`, mix releases, and Erlang distribution have in common? More than is immediately obvious when you look at these concepts individually. However, when you start to peel away the surface you will discover some really elegant solutions which are unique to the Elixir runtime.

Imagine that you just received a request to standardize the logging format of an Elixir microservice you are the owner of. "Easy enough" you say to yourself, "we're using Elixir 1.16 so we have the [changes in 1.15](https://github.com/elixir-lang/elixir/blob/v1.15.0/CHANGELOG.md#integration-with-erlangotp-logger)" which unified the Elixir and Erlang loggers. So, we can easily standardize to the agreed upon logging format by setting the `:default_formattter` config of the `:logger` application.

You add the config for the formatting:

```
config :logger, :default_formatter,
  ...
```

You even add a test that the formatting works:

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

Looks goo...wait how is that possible? Why didn't our application format some of the logs? We configured the "default formatter", why isn't that format applying to all of the logs?

## Taking a step back

Let's take a step back and describe some interesting properties of the system under question. 

The system is a backend live streaming service which re-encodes the stream in realtime. Video encoding is resource intensive so in order to run multiple streams at the same time we need to ensure that the system has the ability to quickly scale out. It would be nice if we could avoid adding complicated infrastructure resource scheduling logic to our application code.

Additionally, some of the streams can be hours long. We can't end an ongoing live stream because we need to deploy a new version of the application. It would be nice if we could avoid adding complicated draining logic to our application code.

## FLAME and you

With these constraints in mind, we implemented a lambda architecture. Each live stream executes as a [Kuberenetes jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/). This is nice because we let the Kubernetes scheduler figure out what server has the capacity to run the stream. Additionally, we don't have to worry about draining since each stream runs independently. 

If you have been following the recent work from Chris McCord and the team at [fly.io](https:///fly.io) you might notice this sounds similar to what the [FLAME](https://github.com/phoenixframework/flame) project does. However, the FLAME project wasn't released when we started developing, we sort of stumbled into a similar solution.

A super powerful "feature" of FLAME is that it requires the "coordinator" and "job" runtimes to be connected in a cluster with Erlang distribution. This is really good because you can pass arbitrary Erlang terms across them, for example, the arguments to the application's `LiveStream.run(...)` function call. However, our implementation does not require the runtimes to be clustered. Instead, we serialize the `LiveStream.run(...)` command to a string and pass it as an argument to the `rpc` command of our application's release.

Consider the typical Dockerfile you would use to run a Phoenix application. It probably ends with the following `CMD`:

```dockerfile
CMD my_app/bin/my_app start
```

Which is great, when the pod starts the release will be started and start serving web requests. However, our entrypoint to the Kubernetes job is a manifest file which we apply with aKubernetes API call. So, our app basically does:

```dockerfile
CMD sh -c "my_app/bin/my_app start; my_app/bin/my_app rpc LiveStream.run(...)"
```

Note that start is blocking. So we actually background it, spin in a loop until the app starts, then execte the rpc.

## So What

How could the use of rpc to run our command cause some of the logs to be unformatted? Let's take a look at what `mix release` spits out for us to interact with the compiled release:

```sh
~> cat my_app/bin/my_app
#!/bin/sh
set -e

...

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

...

case $1 in
  start)
    start "elixir" --no-halt
    ;;

...

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
...
```

So when we call `my_app/bin/my_app start` the wrapping shell script will start the compiled release's runtime and start the application. Notice that the `remote` and `rpc` look very similar to `start`, however, they add an extra flag: `--hidden`.

From the Erlang documentation:


> A hidden node is a node started with the command-line flag -hidden. Connections between hidden nodes and other nodes are not transitive, they must be set up explicitly. Also, hidden nodes does not show up in the list of nodes returned by nodes/0. Instead, nodes(hidden) or nodes(connected) must be used. This means, for example, that the hidden node is not added to the set of nodes that global is keeping track of.

This is pretty interesting! When we `remote` into a running release our shell is actually running in a new Erlang node connected to the primary node, however, the primary node can't see the remote node. Okay great, but what does this have to do with the log formatting?

Well, if we check the output of `:logger.get_handler_config(:default)` we can see there is a filter applied to logs coming from remote nodes:

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
