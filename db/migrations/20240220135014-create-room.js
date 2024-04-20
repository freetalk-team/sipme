'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('room', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(64)
        , allowNull: false
      },
      domain: {
        type: Sequelize.STRING(64)
        , allowNull: false
      },
      flag: {
        type: Sequelize.INTEGER
        , allowNull: false
      },
      info: Sequelize.JSONB
    }, 
    {
      uniqueKeys: {
        unique_tag: {
            customIndex: true,
            fields: ['name', 'domain']
        }
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('room');
  }
};
