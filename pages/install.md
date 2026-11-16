# Install SwarmUp

This guide takes you from a clean Windows machine to a first task done by an agent, in about
15 minutes.

## What you need

- Windows 10 or 11, with your normal user account. The installer needs no administrator rights.
- [Git](https://git-scm.com/download/win), with your name and email set. SwarmUp keeps tasks in a
  git repository, and agents commit there. If you have never committed on this machine, set them
  once:

  ```sh
  git config --global user.name "Your Name"
  git config --global user.email you@example.com
  ```

- At least one coding agent from your AI provider, installed and signed in. Today that is
  [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`) or
  [Codex](https://github.com/openai/codex) (`codex`); more providers are on the way. Agents run
  under your own plans and keys; SwarmUp never sees them.

## 1. Install the app

1. Download the installer from the [download page](download.html) and run it.
2. Windows SmartScreen asks first, because the installer is not code-signed yet: choose
   **More info**, then **Run anyway**.
3. Leave **Add the swarmup command to my PATH** checked, so `swarmup` works in PowerShell, Command
   Prompt and Git Bash.

The installer puts the desktop app, the orchestrator and the `swarmup` command in your user folder.
The orchestrator is the background process that starts your agents, keeps them within your limits
and merges approved work; its program and log files are called `swarmupd`. The app updates itself:
a new version downloads in the background and installs once no agent run is live and the window is
closed.

## 2. Make a folder for your tasks

Tasks live in a git repository of their own. Open a new terminal, so it picks up the new PATH:

```sh
mkdir my-tasks
cd my-tasks
git init
swarmup init --name my-tasks --human human:you
```

`swarmup init` creates a `.swarmup` folder that holds tasks, agents and notes. To share the queue
with another machine, add a git remote; `swarmup sync` commits and pushes it.

## 3. Start the app

Start **SwarmUp** from the Start menu. On the first start it asks for your id (such as
`human:you`) and the folder that holds your tasks: pick `my-tasks`. Then it adds an engineer, a
QA, a reviewer and a PM agent for each coding agent it finds, such as `codex:engineer` and
`claude:engineer`, starts the orchestrator and shows your inbox.

Check the machine from a terminal:

```sh
swarmup doctor
```

It reports the user config, your task folders, whether `claude` and `codex` are installed and
signed in, and whether the orchestrator runs. Fix anything it marks before you go on.

### Without the app

To use only the command line, write your user config and start the orchestrator yourself, from
the `my-tasks` folder:

```sh
swarmup setup --me human:you --root .
swarmup daemon start
swarmup doctor
```

`swarmup setup` adds the same agents as the app and prints their names. `--root` takes the path of
any task folder, so you can run `swarmup setup` from anywhere with the full path instead of `.`.

## 4. Give an agent its first task

Create a task and start a run:

```sh
swarmup new "Add a README to this folder" --to codex:engineer --as human:you
swarmup launch codex:engineer --task T-0001 --budget 30m
```

With Claude Code instead of Codex, use `claude:engineer` in both commands. `swarmup new` prints the
task id; use it in `--task` if it is not `T-0001`. If `swarmup launch` reports that swarmupd is
paused, run `swarmup daemon resume` and launch again. In the first minute after the orchestrator
starts, a Codex launch can report that swarmupd repairs what Codex sessions left: wait a minute
and launch again. Watch the run in the app's **Runs** view, or in a terminal:

```sh
swarmup runs --all
swarmup logs 6SWS01PR
```

`swarmup runs` lists only live runs; `--all` also lists the ones that ended. Replace `6SWS01PR`
with the id in the first column of your `swarmup runs --all` output; `swarmup launch` also prints
the full id.

The agent finishes with a review request, and the orchestrator commits its work on a branch of its
own. `swarmup show T-0001` shows who the review went to. With both Claude Code and Codex set up,
it goes to the other provider's reviewer, such as `claude:reviewer`, which you start the same way
with `swarmup launch`. A review sent to you lands in your inbox: read the result, then approve it
or ask for changes.

To have the orchestrator start agents on its own when work arrives, turn on **wake** for them in
the app's **Settings**, or set `wake: true` in the user config (see
[the supervisor docs](../../docs/supervisor.md)).

## macOS and Linux

The desktop installer is Windows-only today. On macOS and Linux, run SwarmUp from source with
Node.js 22 or later and git:

```sh
git clone https://github.com/dawid-ai/swarmup.git
cd swarmup
npm install
npm run build
npm run swarmup -- help
```

Then follow steps 2 to 4 with `npm run swarmup --` in place of `swarmup`, and start the
orchestrator with `npm run swarmup -- daemon start`. `npm run desktop` opens the app from the
checkout.

## Troubleshooting

- **`swarmup: command not found`**, or the term is not recognized: the terminal was open before
  the installer changed your PATH. Open a new terminal. If it still fails, run the installer
  again with **Add the swarmup command to my PATH** checked.
- **`Author identity unknown`**, or `swarmup doctor` fails **Git identity**: git has no name and
  email on this machine, so neither `swarmup sync` nor agents can commit. Run the two
  `git config --global` commands from [What you need](#what-you-need).
- **`owner ... is not a configured agent`** from `swarmup new`: no agent has that name on this
  machine. The message lists the ones you have, such as `codex:engineer`; pick one of them.
- **`... is proposed in its role file`** when you launch: someone added a role file under
  `.swarmup/agents/` that is still a draft. `swarmup agents` lists role files with their status.
  Set `status: active` in the file, or launch another agent.
- **`'claude' is not on PATH`** (or `codex`) in `swarmup doctor` or a launch: the agent CLI is not
  installed, or this terminal cannot find it. Install it, open a new terminal and check that
  `claude --version` or `codex --version` works. If it lives elsewhere, set its full path as
  `swarmupd.runtimes.<name>.command` in the user config.

## Next steps

- [How SwarmUp works](../../README.md): tasks, agents, the orchestrator and how data is stored.
- [The protocol](../../docs/protocol.md): statuses, reviews, handoffs and permissions.
- [The desktop app](../../docs/desktop.md): every view and setting.
- [The changelog](../../UPDATES.md): what changed in each release.
