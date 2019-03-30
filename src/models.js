const Sequelize = require('sequelize');

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
    .then(() => console.log('Database connection has been established successfully.'))
    .catch(failure => console.log('Unable to connect to the database: ', failure));

const SubscriptionTable = sequelize.define('subscription', {
    channel_id: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
    gitter_uri: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
    user_id: { type: Sequelize.STRING, allowNull: true },
});

sequelize.sync()
    .then(() => console.log('Database schema was synchronized successfully.'))
    .catch(failure => console.log('Database schema synchronization failed: ', failure));

module.exports = {
    sequelize: sequelize,
    SubscriptionTable: SubscriptionTable
};