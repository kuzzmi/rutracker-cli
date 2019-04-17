```
   ___      _               _                      _ _
  | _ \_  _| |_ _ _ __ _ __| |_____ _ _   ___   __| (_)
  |   / || |  _| '_/ _` / _| / / -_) '_| |___| / _| | |
  |_|_\\_,_|\__|_| \__,_\__|_\_\___|_|         \__|_|_|

```

# rutracker-cli

Node.js command line interface to RuTracker for downloading `.torrent` files.

![demo.gif](https://raw.githubusercontent.com/kuzzmi/rutracker-cli/master/public/demo.gif)

# Features
0. Download one or multiple .torrent files from [RuTracker](https://rutracker.org)
1. Saves authentication data for later use
2. Categorized search results
3. Search results sorted by size and seeders
4. Color coded stats (red = missing seeders, orange = seeders' count equals leechers', green = all good)
5. Can be used in semi-interactive mode using arguments (username, password, search query)

# Configuration

Once you start `rutracker-cli` it will create a default configuration file at:

```
cat ~/.config/rutracker-cli/config.json
```

With the following contents:

```
{
	"downloadPath": "/home/%user%/Torrents",
	"username": "",
	"password": ""
}
```

To update where `.torrent` files will be downloaded simply update `downloadPath` option.

# Installation

To run `rutracker-cli`, you must have Node.js and npm installed. If they are not installed, follow the instructions here: https://nodejs.org/ and https://www.npmjs.com/

Once npm is installed, run the following:

```
npm i -g rutracker-cli
```

# Usage

This will run `rutracker-cli` interactive mode:
```
rutracker-cli
```

This will start searching immediately:

```
rutracker-cli -q "Search Query"
// or
rutracker-cli --query="Search Query"
```

This will use username `kuzzmi` and password `123123` from arguments:

```
rutracker-cli -u kuzzmi -p 123123
rutracker-cli --username="kuzzmi" --pasword="123123"
```

# TODO

* Use DBus for getting secrets from GNOME/Keyring instead of plaintext password storage
* Custom sorting
* Configurable from arguments download path
* Fully non-interactive mode
* ...tests

# Contributions...

...are always welcome. Open a pull request or an issue ;)
