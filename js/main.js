function Game() {
  this.board = new Board();

  this.run = function() {
    this.board.start();
  }
}

//
// Board
//
function Board() {
  var self = this;
  this.div = document.getElementById("div-board");

  this.deck   = new Deck();
  this.bunchs = new Array();

  this.drags = new Array();
  this.dragX = 100;
  this.dragY = 50;

  this.start = function() {
    self.createBunchs();
    self.shuffle();
    self.registerMouse();
  }

  this.createBunchs = function() {
    self.createBunch("pile",  50, 180, 1);
    self.createBunch("pile", 200, 180, 2);
    self.createBunch("pile", 350, 180, 3);
    self.createBunch("pile", 500, 180, 4);
    self.createBunch("pile", 650, 180, 5);
    self.createBunch("pile", 800, 180, 6);
    self.createBunch("pile", 950, 180, 7);
    self.createBunch("deck",   5,   0, 0, self.createBunch("pair", 155, 0, 3) );
    self.createBunch("end",  500,   0, 0);
    self.createBunch("end",  650,   0, 0);
    self.createBunch("end",  800,   0, 0);
    self.createBunch("end",  950,   0, 0);
  }

  this.createBunch = function(type, left, top, initial, pair) {
    var div   = self.createBunchDiv(left, top);
    var bunch = new Bunch(div, self, type, initial, pair);

    self.bunchs.push(bunch)
    self.div.appendChild(div)

    return(bunch);
  }

  this.createBunchDiv = function(left, top) {
    var id     = "bunch" + String(self.bunchs.length);
    var width  = self.deck.cardWidth-2;
    var height = self.deck.cardHeight-2;

    return( createDiv(id, "bunch", left, top, width, height) );
  }

  this.shuffle = function() {
    var index = 0;
    for (var i = 0; i < self.deck.cardTotal; ++ i) {
      self.createCard(self.bunchs[index], self.deck.throwCard() );
      if ( self.bunchs[index].isInitialFull() )
         ++ index;
    }
  }

  this.createCard = function(bunch, id) {
    var reverse = bunch.initialCardReverse();
    var img     = self.createCardImg(bunch, id, reverse);
    var card    = new Card(img, bunch, id, reverse);

    bunch.addCard(card);
    self.div.appendChild(img);
  }

  this.createCardImg = function(bunch, id, reverse) {
    var zIndex  = bunch.initialCardZIndex();
    var left    = bunch.initialCardLeft();
    var top     = bunch.initialCardTop();
    var width   = self.deck.cardWidth;
    var height  = self.deck.cardHeight;
    var src     = self.deck.cardSrc(id, reverse);

    return( createImg("card" + String(id), "card", zIndex, left, top, width, height, src) );
  }

//
// Mouse
//
  this.registerMouse = function() {
    document.onclick  = self.onclick;
    document.onmousedown = self.onMouseDown;
    document.onmousemove = self.onMouseMove;
    document.onmouseup   = self.onMouseUp;
  }

  this.unregisterMouse = function() {
    document.onclick  = null;
    document.onmousedown = null;
    document.onmousemove = null;
    document.onmouseup   = null;
  }

  this.onclick = function(e) {
    var object = getMouseObject(e);
    switch(object.className){
      case "card" : object.card.onclick();  break;
      case "bunch": object.bunch.onclick(); break;
    }
  }

  this.onMouseDown = function(e) {
    var object = getMouseObject(e);
    if (object.className == "card") {
      var card = object.card;

      self.drags = card.bunch.getDrags(card);
      if (self.drags.length > 0) {
        self.dragX = pxToNumber(self.drags[0].img.style.left) - getMouseX(e);
        self.dragY = pxToNumber(self.drags[0].img.style.top)  - getMouseY(e);

        for (var i in self.drags) {
          self.drags[i].originalLeft   = self.drags[i].img.style.left;
          self.drags[i].originalTop    = self.drags[i].img.style.top;
          self.drags[i].originalZIndex = self.drags[i].img.style.zIndex;
          self.drags[i].img.style.zIndex = 1000 + i;
        }

        return(false);
      }
    }
  }

  this.onMouseMove = function(e) {
    var left = self.dragX + getMouseX(e);
    var top  = self.dragY + getMouseY(e);

    for (var i in self.drags) {
      self.drags[i].img.style.left = String(left) + "px";
      self.drags[i].img.style.top  = String(top + (20 * i) ) + "px";
    }

    return(self.drags.length == 0);
  }

  this.onMouseUp = function(e) {
    if (self.drags.length) {

      var left = self.dragX + getMouseX(e);
      var top  = self.dragY + getMouseY(e);

      var bunch = self.getBunchDrop(left, top);
      if (bunch)
        for (var i in self.drags)
          bunch.adquireCard(self.drags[i]);
      else
        for (var i in self.drags){
          self.drags[i].img.style.left   = self.drags[i].originalLeft;
          self.drags[i].img.style.top    = self.drags[i].originalTop;
          self.drags[i].img.style.zIndex = self.drags[i].originalZIndex;
        }

      self.drags.length = 0;
      self.checkEnd();
    }
  }

  this.getBunchDrop = function(left, top) {
    for (var i in self.bunchs) {
      if ( self.collition(left, top, self.bunchs[i].div) )
        if ( self.bunchs[i].acceptCards(self.drags) )
          return(self.bunchs[i]);

      for (var j in self.bunchs[i].cards)
        if ( self.collition(left, top, self.bunchs[i].cards[j].img) )
          if ( self.bunchs[i].acceptCards(self.drags) )
            return(self.bunchs[i]);
    }
  }

  this.collition = function(left, top, element) {
    return( (left >= pxToNumber(element.style.left) ) &&
            (left <  pxToNumber(element.style.left) + self.deck.cardWidth) &&
            (top  >= pxToNumber(element.style.top) ) &&
            (top  <  pxToNumber(element.style.top) + self.deck.cardHeight) );
  }

//
// Game over rules
//
  this.tryEnd = function(card) {
    for (var i in self.bunchs)
      if ( self.bunchs[i].acceptEnd(card) ) {
        self.bunchs[i].adquireCard(card);
        break;
      }

    self.checkEnd();
  }

  this.checkEnd = function() {
    var end = 0;
    for (var i in self.bunchs)
      if ( self.bunchs[i].isEnded() )
        ++ end;

    if (end == 4) {
      self.unregisterMouse();
      alert("Congratulations!!! You have solved the Solitarie.\r\nClose this message and press F5 to play a new game.");
    }
  }

}

//
// Bunch
//
function Bunch(div, board, type, initial, pair) {
  var self = this;

  this.div     = div;
  this.board   = board;
  this.type    = type;
  this.initial = initial;
  this.pair    = pair;

  this.cards = new Array();

  this.div.bunch = self;

//
// Mouse
//
  this.onclick = function() {
    if (self.type == "deck")
      while(self.pair.cards.length != 0)
        self.adquireCard( self.pair.onTop() );
  }

  this.onclickCard = function(card) {
    if (self.type != "end")
      if ( self.isOnTop(card) )
        self.board.tryEnd(card);
  }

  this.onclickReverse = function(card) {
    if (self.type == "deck")
      self.onclickReverseDeck(card);
    else {
      if ( self.isOnTop(card) )
        card.flip();
    }
  }

  this.onclickReverseDeck = function(card) {
    if (self.pair.cards.length > 1) {
      self.pair.onTop().img.style.left = self.pair.div.style.left;
      self.pair.middle().img.style.left = self.pair.div.style.left;
  }
    if (self.cards.length > 1)
      self.pair.adquireCard( self.onTop() );
    if (self.cards.length >= 1) {
      self.pair.adquireCard( self.onTop() );
      self.pair.onTop().img.style.left = String( pxToNumber(self.pair.div.style.left) + 20) + "px";
      self.pair.adquireCard( self.onTop() );
      self.pair.onTop().img.style.left = String( pxToNumber(self.pair.div.style.left) + 40) + "px";
    }
  }

//
// Cards management
//
  this.addCard = function(card) {
    self.cards.push(card);
  }

  this.removeCard = function(card) {
    var cards = new Array();
    for(var i in self.cards)
      if (card.id != self.cards[i].id)
        cards.push(self.cards[i]);
    self.cards = cards;
  }

  this.adquireCard = function(card) {
    card.bunch.removeCard(card);
    self.addCard(card);
    card.moveTo(self);
  }

  this.onTop = function() {
    return( self.cards[self.cards.length - 1] );
  }

  this.middle = function() {
    return( self.cards[self.cards.length - 2] );
  }

  this.isOnTop = function(card) {
    return( card.id == self.onTop().id );
  }

//
// Drag
//
  this.getDrags = function(card) {
    var drags = new Array();
    if (!card.reverse)
      switch(self.type) {
        case "pair": drags = self.getDragsTop(card);  break;
        case "pile": drags = self.getDragsPile(card); break;
        case "end" : drags = self.getDragsTop(card);  break;
      }
    return(drags);
  }

  this.getDragsTop = function(card) {
    drags = new Array();
    if ( card.id == self.onTop().id )
      drags.push(card);
    return(drags);
  }

  this.getDragsPile = function(card) {
    drags = new Array();
    for (var i in self.cards)
      if (self.cards[i].id == card.id) {
        for (; i < self.cards.length; ++ i)
          drags.push(self.cards[i]);
        break;
      }
    return(drags);
  }

//
// Accept card rules
//
  this.acceptCards = function(cards) {
    if (self.type == "pile")
      return( self.acceptCardPile(cards[0]) );

    if ( (self.type == "end") && (cards.length == 1) )
      return( self.acceptCardEnd(cards[0]) );

    return(false);
  }

  this.acceptCardPile = function(card) {
    if (self.cards.length == 0)
      return(card.number == 13);

    if (self.onTop().reverse == false)
      if (self.onTop().number == card.number + 1)
        return(self.onTop().color != card.color);

    return(false);
  }

  this.acceptCardEnd = function(card) {
    if (self.cards.length == 0)
      return(card.number == 1);

    if (self.cards.length == card.number - 1)
      return(self.cards[0].suit == card.suit);

    return(false);
  }

//
// End rules
//
  this.acceptEnd = function(card) {
    if (self.type != "end")
      return(false);

    return( self.acceptCardEnd(card) );
  }

  this.isEnded = function() {
    if (self.type != "end")
      return(false);

    return( self.cards.length == self.board.deck.cardSuit );
  }

//
// Initial rules
//
  this.initialCardLeft = function() {
    var left = pxToNumber(self.div.style.left);

    return(left + ( (self.type == "pair")? (20* self.cards.length): 0) );
  }

  this.initialCardTop = function() {
    var top = pxToNumber(self.div.style.top);

    return(top + ( (self.type == "pile")? (20 * self.cards.length): 0) );
  }

  this.initialCardZIndex = function() {
    return(self.cards.length);
  }


  this.initialCardReverse = function() {
    switch(self.type) {
      case "deck": return(true);
      case "pair": return(false);
      case "pile": return(self.cards.length != self.initial - 1);
    }
  }

  this.isInitialFull = function() {
    return(self.cards.length == self.initial);
  }

//
// Non initial rules
//
  this.cardLeft = function() {
    return( pxToNumber(self.div.style.left) );
  }

  this.cardTop = function() {
    var top = pxToNumber(self.div.style.top);

    return(top + ( (self.type == "pile")? (20 * ( self.cards.length - 1) ): 0) );
  }

  this.cardZIndex = function() {
    return(self.cards.length);
  }

  this.cardReverse = function() {
    switch(self.type) {
      case "deck": return(true);
      case "pair": return(false);
      case "pile": return(false);
      case "end" : return(false);
    }
  }
}

//
// Card
//
function Card(img, bunch, id, reverse) {
  var self = this;

  this.img     = img;
  this.bunch   = bunch;
  this.id      = id;
  this.reverse = reverse;

  this.suit    = Math.floor(id / self.bunch.board.deck.cardSuit);
  this.number  = Math.floor(id % self.bunch.board.deck.cardSuit) + 1;
  this.color   = Math.floor(id / self.bunch.board.deck.cardSuit) % 2;

  this.img.card = self;

  this.onclick = function() {
    self.reverse? self.bunch.onclickReverse(self): self.bunch.onclickCard(self);
  }

  this.flip = function() {
    self.reverse = !self.reverse;
    self.img.src = self.bunch.board.deck.cardSrc(self.id, self.reverse);
  }

  this.moveTo = function(bunch) {
    self.bunch = bunch;

    self.img.style.zIndex = self.bunch.cardZIndex();
    self.img.style.left   = String( self.bunch.cardLeft() ) + "px";
    self.img.style.top    = String( self.bunch.cardTop() ) + "px";
    self.reverse          = self.bunch.cardReverse();
    self.img.src          = self.bunch.board.deck.cardSrc(self.id, self.reverse);
  }
}

//
// Deck
//
function Deck() {
  this.cardWidth     = 103.125;
  this.cardHeight    = 150;
  this.cardSuit      = 13;
  this.cardTotal     = 52;
  this.cardURL       = "img/";
  this.cardReverse   = "reverse";
  this.cardName      = "card";
  this.cardExtension = ".png";

  this.throwed = new Array( this.cardTotal );

  this.throwCard = function() {
    var id = Math.floor( Math.random() * this.throwed.length );

    while(this.throwed[id])
      if (++ id == this.throwed.length)
        id = 0;
    this.throwed[id] = true;

    return(id)
  }

  this.cardSrc = function(id, reverse) {
    var srcname = (reverse)? this.cardReverse: ( this.cardName + String(id) );

    return( this.cardURL + srcname + this.cardExtension );
  }
}

//
// Utils
//
function createDiv(id, className, left, top, width, height) {
  var div = document.createElement("div");

  div.id           = id;
  div.className    = className;
  div.style.left   = String(left)   + "px";
  div.style.top    = String(top)    + "px";
  div.style.width  = String(width)  + "px";
  div.style.height = String(height) + "px";

  return(div);
}

function createImg(id, className, zIndex, left, top, width, height, src) {
  var img = document.createElement("img");

  img.id           = id;
  img.className    = className;
  img.style.zIndex = zIndex;
  img.style.left   = String(left)   + "px";
  img.style.top    = String(top)    + "px";
  img.style.width  = String(width)  + "px";
  img.style.height = String(height) + "px";
  img.src          = src;

  return(img);
}

function getMouseObject(e) {
  return(e? e.target: window.event.srcElement);
}

function getMouseX(e) {
  return(e? e.clientX: window.event.clientX);
}

function getMouseY(e) {
  return(e? e.clientY: window.event.clientY);
}

function pxToNumber(s) {
  return( Number( s.substring(0, s.length - 2) ) );
}

//
// Instance and start Game
//
var game = new Game;
game.run();
