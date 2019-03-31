const Sequelize = require('sequelize');
const logger = require('./log.js');


const sequelize = new Sequelize(
    process.env.SQLITE_DATABASE,
    process.env.SQLITE_USER,
    process.env.SQLITE_PASS,
    {
    // sqlite! now!
    dialect: 'sqlite',

    // the storage engine for sqlite
    // - default ':memory:'
    storage: process.env.SQLITE_DATABASE_PATH,
    logging: (message) => logger.debug(message),
});

sequelize.authenticate()
    .then(() => logger.debug('Database connection has been established successfully.'))
    .catch(failure => logger.error('Unable to connect to the database: %s', failure));

const SubscriptionTable = sequelize.define('subscription', {
    channel_id: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
    gitter_uri: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
    user_id: { type: Sequelize.STRING, allowNull: true },
});

sequelize.sync()
    .then(() => logger.debug('Database schema was synchronized successfully.'))
    .catch(failure => logger.error('Database schema synchronization failed: %s', failure));

module.exports = {
    sequelize: sequelize,
    SubscriptionTable: SubscriptionTable
};