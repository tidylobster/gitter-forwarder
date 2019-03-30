const Sequelize = require('sequelize');
const log = require('console-log-level')({
    prefix: () => { return new Date().toISOString() },
    level: 'info'
});

const sequelize = new Sequelize(
    process.env.POSTGRES_DATABASE,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASS,
    {
        host: 'localhost',
        dialect: 'postgres',
    }
);

sequelize.authenticate()
    .then(() => log.debug('Database connection has been established successfully.'))
    .catch(failure => log.fatal('Unable to connect to the database: ', failure));

const SubscriptionTable = sequelize.define('subscription', {
    channel_id: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
    gitter_uri: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
    user_id: { type: Sequelize.STRING, allowNull: true },
});

sequelize.sync()
    .then(() => log.debug('Database schema was synchronized successfully.'))
    .catch(failure => log.fatal('Database schema synchronization failed: ', failure));

module.exports = {
    sequelize: sequelize,
    SubscriptionTable: SubscriptionTable
};