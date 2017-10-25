module.exports = function (io) {
  var NUM_ITERATIONS = 1000;

  function Arena(name) {
    this.name = name;
    this.clients = [];
    this.elapsedIterations = 0;
  }

  Arena.prototype.addClient = function (client) {
    this.clients.push(client);
  };

  Arena.prototype.removeClient = function (client) {
    var index = this.clients.indexOf(client);
    if (index !== -1) {
      this.clients.splice(index, 1);
    }
  };

  Arena.prototype.nextTick = function () {
    var workloadShare = Math.floor(NUM_ITERATIONS / this.clients.length);

    for (var i = 0; i < this.clients.length; i++) {
      this.clients[i].emit('train', workloadShare);
    }

    var self = this;

    setTimeout(function () {
    }, 100);
  };

  Arena.prototype.reset = function () {
    
  };

};