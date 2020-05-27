const Sequelize = require('sequelize');
const { logger } = require('./log.js');

const sequelize = new Sequelize(
  process.env.POSTGRES_DATABASE,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    logging: msg => logger.debug(msg),
  }
);

const Subscriptions = sequelize.define('subscriptions', {
  channelId: { 
    type: Sequelize.STRING,
    allowNull: false, 
    unique: "compositeIndex"
  },
  gitterUri: { 
    type: Sequelize.STRING, 
    allowNull: false, 
    unique: "compositeIndex" 
  },
});

const SubscriptionsRepository = function() {};

SubscriptionsRepository.prototype.getAllUri = async function() {
  /*
  Get all distinct URIs.
  */
  return Subscriptions.findAll({
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col('gitterUri')) ,'gitterUri'],
    ],
  });
};

SubscriptionsRepository.prototype.getByChannel = async function(channelId) {
  /*
  Get all subscriptions for a given channel.
  */
  return Subscriptions.findAll({
    where: { channelId: channelId }
  });
}

SubscriptionsRepository.prototype.getByUri = async function(gitterUri) {
  /*
  Get all subscriptions for a given URI.
  */
  return Subscriptions.findAll({
    where: { gitterUri: gitterUri }
  });
}

SubscriptionsRepository.prototype.addForChannel = async function(channelId, gitterUri) {
  /*
  Add a subscription for a given URI for a given channel.
  */
  return Subscriptions.create({
    channelId: channelId,
    gitterUri: gitterUri,
  });
}

SubscriptionsRepository.prototype.removeForChannel = async function(channelId, gitterUri) {
  /*
  Remove a subscription for a given URI for a given channel.
  */
  return Subscriptions.destroy({
    where: {
      channelId: channelId,
      gitterUri: gitterUri,
    }
  });
}

SubscriptionsRepository.prototype.removeByUri = async function(gitterUri) {
  /*
  Remove subscriptions for a given URI for all channels.
  */
  return Subscriptions.destroy({
    where: {
      gitterUri: gitterUri,
    }
  });
}

async function initDb() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database: %s', error);
    process.exit(1);
  }
  
  try {
    await sequelize.sync();
    logger.info('Database schema was synchronized successfully.');
  } catch (error) {
    logger.error('Database schema synchronization failed: %s', error);
    process.exit(1);
  }
}

module.exports = {
  SubscriptionsRepository: SubscriptionsRepository,
  initDb: initDb,
};