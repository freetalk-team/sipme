'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RoomMembers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  RoomMembers.init({
    id: { type: DataTypes.INTEGER, primaryKey: true},
    name: DataTypes.STRING,
    domain: DataTypes.STRING,
    // flag: DataTypes.INTEGER,
    info: DataTypes.JSONB,
    uri: DataTypes.STRING,
    members: DataTypes.JSON
    // members: {
    //   type: DataTypes.JSONB,
    //   get: function() {
    //     return JSON.parse(this.getDataValue("members"));
    //   },
    //   // set: function(value) {
    //   //   return this.setDataValue("members", JSON.stringify(value));
    //   // }
    // }
  }, {
    sequelize,
    modelName: 'RoomMembers',
    tableName: 'room_members',
    timestamps: false
  });
  return RoomMembers;
};
