# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## TEMPLATE
### Added
-

### Changed
-

### Removed
-

## 11/10/2018
### Changed
* `drop`: This coommand now uses an image format -- "x" marks the spot to drop!

## 11/9/2018
### Changed
* `drop`: Added a way to "re-roll" the random drop by using emotes.

## 11/7/2018
### Changed
* The bot is officially rebranded to **PUBG Buddy**
* The bot is **officially** featured through [PUBG](https://developer.playbattlegrounds.com/featured_apps?locale=en).


## 10/10/18
### Changed
* Servers can use the default prefix - `!pubg-` - as well as their server customized prefix. Both work now.
* Fixed bug in `lastMatch` which caused the command not work.
* Fixed the `help` command

## 10/9/2018
### Added
* Added `lastMatch` which will generate a match summary for the last match that you played. It will also show a match summary of all your teammates.

### Changed
* Updated formatting on messages to make more important pieces of text stand out.

## 10/8/2018
### Added
* Added a "reaction" message on commands (`rank`, `top`, `compare`, `matches`) you can use reactions to switch modes on with reacting to the message.

### Changed
* Updated matches to return some more meta-data on the match - map and time (pictured below)
* Temporarily removing the xbox region until PUBG API can figure out how to properly handle the new endpoints.
* Miscellaneous bug fixes

## 10/03/2018
### Added
* I spent most of my work lunch but I at least have `rank`, `top`, and matches working right now. I will work on fixing any other errors when I get home later!
* Added `rank` emblems to the `rank`, compare, and `top` commands for the newest seasons (which is pc-2018-01 -- PUBG decided to do a new format :rolling_eyes: )
* Note that the new `rank` emblems will ONLY show up for the new seasons from this point forward and ONLY for PC at this time.

`rank` - https://media.discordapp.net/attachments/423248493084409877/497243284729757700/file.jpg

## 10/1/2018
### Added
* Added a new command - `profile` - so that users can see what pubg player they are registered as. You can also view another discord user's profile by doing `!pubg-profile <Discord Mention>`.

## 09/30/2018
* Added new command - compare so that you can easily compare two players. Use it by running `!pubg-compare <playerA> <playerB>` or `!pubg-compare <playerB>` if you're already registered. (Pictured below)
* Other bots like Nightbot should be able to trigger the PUBG bot now so your servers can make short-cut commands -- this was a requested change by a github user.
* Consolidated the fonts I use in images to be Teko so that everything looks uniform :smiley:

Compare - https://media.discordapp.net/attachments/423248493084409877/496085388314542080/file.jpg?width=945&height=612

## 09/29/2018
### Added
* Adding a caching service to make the new image output more performant.

### Changed
* Updated `top` to have an image output by default. With the new format I can display more stats. You can still access the text based format by running `!pubg-`top` =text` but I think you all will prefer the new format.
* Updated `drop` to have the location's map coordinates as well - this will help you figure out where to the location it returns actually is on the map.

    Both Modes Played : https://media.discordapp.net/attachments/475770414413643786/495703467776802839/file.jpg?width=916&height=702

    Only one mode played: https://media.discordapp.net/attachments/475770414413643786/495703418447593472/file.jpg?width=1080&height=594

    ALSO, an important thing about this image output is that you can easily share them by url or by copying the image so get to sharing!

## 09/27/2018
### Changed
* Changed the output for `rank` to be an image for easier viewing and sharing across platforms.
* You can view text based `rank` by running `!pubg-`rank` Thomas-O =text`.

## 09/07/2018
### Changed
* Fixed commands that dealt with season statistics (`matches`, `top`, `rank`) not behaving correctly when a user has not played that season.

## 08/24/2018
### Changed
* Simplified the `setServerDefaults` command so that you dont have to type out every parameter (prefix, season region, mode) -- now you just have to specify what you want to change!
* Fixed typo in reaction error message

## 08/11/2018
### Changed
* Fixed a typo in `rank` - "Matches player" --> "Matches played"
* In the `top` command I now remove players that have not played any matches to clear up some of the "empty" data.
* Updated the contributing guide as it was a little out-dated - thanks @KeenKrozzy  !

## 08/08/2018
### Changed
* Fixed `top` command only running the command on a max of 5 players.
* Fixed default server values that were assigned to new servers being old values that were incompatible with the new api (whoops :rolling_eyes: )
* Added username validation checks which mysteriously disappeared when I upgraded to new api

## 08/05/2018
### Added
* #12 - Implemented the official PUBG API
* #23 - Added 'pagination' through reactions on the `rank`, `top`, and matches commands
* #25 - Adding a caching service
* #16 - Added extra information to `rank` command
* #24 - Make prefix detection case insensitive
* #17 - Allow user to create a mapping between their discord user and a pubg user to make commands easier to use. This is done with the register command.
* #26 - Added a matches command to get the 5 most recent matches and provide redirects to view each match.
* #27 - Added required analytics to the commands so I can give required reports to Bluehole for using the PUBG Api
* Added a new command drop (used with !pubg-drop e). This command gives you a random place to drop dependent on the map that you pass in.

    'e' -- Erangel
    'm' -- Miramar
    's' -- Sanhok

### Changes
* Since the bot now uses the Official PUBG API the IDs previously being referenced for the pubg.op.gg api are invalid.
          * Database tables dealing with caching these values will need to be cleared.
          * Because of this, the user will need to run addUser to add users to their servers again.
* Bot now requires `Text Permissions > Manage Messages` permission to handle the pagination implementation.
* Parameters were renamed to follow PUBG's api.
* PUBG Usernames are now case-sensitive because of how the API works.

## 08/01/2018
### Added
* Added Season 8 as a valid season using 2018-08 as a parameter. Be sure to update your server defaults!

## 07/07/2018
### Changed
* Updated bot to handle pubg.op.gg region specification of `<system>-<region>`

## 07/05/2018
### Added
* Added Season 7 as a valid season using 2018-07 as a parameter. Be sure to update your server defaults!

## 06/04/2018
### Changed
* Refactored the ENTIRE bot from javascript to typescript.

## 06/03/2018
### Added
* Added Avg Dmg to the `top` command

## 05/31/2018
### Added
* Added Season 6 as a valid season using 2018-06 as a parameter. Be sure to update your server defaults!

## 05/29/2018
### Changed
* Added bugfix for addUser and removeUser commands incorrectly attempting to add a "region=" player when specifying a region.

## 05/05/2018
### Changed
* Changed the `addUser` and `removeUser` commands to take a list of 1 to infinite usernames that you want to add or remove to a server.

## 05/03/2018
### Added
* Added season 5

## 03/27/2018
### Added
- Added `Season 4` as a valid season using `2018-04` as a parameter.

### Changed
- all servers to use season 4 as their default so users don't have to manually.
- Split `kr/jp` into their own distinct regions `kr` and `jp` since PUBG also updated this.

## 03/24/2018
### Added
- Four new commands: `getModes`, `getSeasons`, `getRegions`, and `getSquadSizes`.

### Changed
- Error handling for commands so you can know **EXACTLY** why the commands are messing up.

### Removed
-

## 03/21/2018
### Changed
- `top` command's progress update by batching edit requests - speeds up overall command by at least 60%.

## 03-18-2018
### Added
- Error messages that explain what is wrong with command.

### Changed
-  `!pubg-info` command to see meta data on bot.
- Exposed more player data in `rank` and `top` commands.

## 03-17-2018
### Added
- The bot was released!

[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.8...v0.1.0
[0.0.8]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.7...v0.0.8
[0.0.7]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.6...v0.0.7
[0.0.6]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.5...v0.0.6
[0.0.5]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.1...v0.0.2
