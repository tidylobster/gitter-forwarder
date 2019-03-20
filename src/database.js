const Sequelize = require('sequelize');

const p_db = process.env.POSTGRES_DATABASE;
const p_user = process.env.POSTGRES_USER;
const p_pass = process.env.POSTGRES_PASS;

const sequelize = new Sequelize(p_db, p_user, p_pass, {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const Subscription = sequelize.define('subscription', {
  channel_id: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
  gitter_uri: { type: Sequelize.STRING, allowNull: false, unique: "compositeIndex" },
  user_id: { type: Sequelize.STRING, allowNull: true },
});

sequelize.sync();

Subscription.findAll()
  .then(subs => console.log(`Current subscriptions: ${JSON.stringify(subs, null, 4)}`));

module.exports = Subscription;