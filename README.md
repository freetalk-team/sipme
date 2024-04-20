# Web Messanger

Free, Open Source software. Developed collaboratively by a dedicated team of developers and contributors, this software offers a range of features and functionalities to support various web projects.

## About

**Web Messanger** is a sophisticated communication tool that enables users to engage in text-based conversations, audio calls, video calls, and screen sharing sessions over the internet.. It is 100% free and open source, allowing users to modify the code and use it inside their software.

## Features

- Chat

  Text messages (**Markdown**), video calls, screen sharing

  + SIP proxy
  + Firebase Cloud Messaging (FCM)

- Task board

  Create and edit tasks. Partially compatible with **Trac** database

- Games

  Play online games

- Player

  Listen, watch your local media files. Share albums and playlists

## Installation

### Install packages

```
npm install
```

### Setup database

Setup development database with SQlite

1. Create a database file

```
touch /path/to/app.db
```

2. Edit database configuation

```
vi db/config/config.json
```

3. Apply migrations and seeds

```
npm install -g sequelize-cli

cd db
npx sequelize-cli db:migrate

npx sequelize-cli db:seed --seed seeders/add-root-user.js
npx sequelize-cli db:seed --seed seeders/add-ticket-components.js
npx sequelize-cli db:seed --seed seeders/add-ticket-milestones.js
npx sequelize-cli db:seed --seed seeders/internal-rooms.js
```

4. Setup SIP proxy

* Edit configuration file
```
cd deploy/kamailio
cp kamailio.sample.cfg kamailio.cfg
vi kamailio.cfg
```

* Edit **docker-compose.yml**
```
vi docker-compose.yml
```

* Test it
```
docker-compose up
```

5. Edit Site configuration
```
cd config
cp local.sample.yaml local.yaml
vi local.yaml
```

## Usage

```
npm start
```

[Open in browser](http://127.0.0.1:3000)

## Contributing

We welcome contributions from the community! If you'd like to contribute to **Web Messanger**, please follow these guidelines:
- Fork the repository
- Create a new branch
- Make your changes
- Submit a pull request

## License

**Web Messanger** is licensed under the Public license

## Acknowledgements

We would like to thank the following contributors for their valuable contributions to **Web Messanger**

- Pavel Patarinski (pavelp.work@gmail.com)

## Donation

We hope you've found our software useful. As a non-profit organization, we rely on the generosity of people like you to continue our mission of creating free/OS software

If you've found our work valuable and would like to support us, please consider making a donation. Your contribution, no matter the size, will make a meaningful difference in the lives of those we serve

Thank you for considering supporting us. Together, we can make a positive impact on our community/world

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XUSKMVK55P35G)
