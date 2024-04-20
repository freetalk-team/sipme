'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('member', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING(64)
        , allowNull: false
      },
      domain: {
        type: Sequelize.STRING(64)
        , allowNull: false
      },
      room: {
        type: Sequelize.STRING(64)
        , allowNull: false
      },
      flag: {
        type: Sequelize.INTEGER
        , allowNull: false
      },
      
    }, 
    {
      uniqueKeys: {
        unique_tag: {
            customIndex: true,
            fields: ['username', 'domain', 'room']
        }
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('member');
  }
};
