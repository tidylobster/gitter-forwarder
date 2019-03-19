var Database = function() {};

Database.prototype.getRoomsURIs = function(){
  return ["tidylobster/community", "tidylobster/not-community"];
};

module.exports = Database;