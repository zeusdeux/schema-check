var $       = require('jquery');
var React   = require('react/addons');
var uuid    = require('node-uuid').v4;
var io      = require('socket.io-client');
var debug   = require('debug');
var dMain   = debug('schema-check:MainComponent');
var dRes    = debug('schema-check:ResultsComponent');
var dSearch = debug('schema-check:SearchComponent');
var MainComponent;
var SearchComponent;
var LoaderComponent;
var ResultsComponent;


MainComponent = React.createClass({
  _onSearchClick: function(url) {
    var self = this;

    dMain('_onSearchClick: making search request with url %s and token %s', url, this.state.token);

    //make ajax request with this.props.token, url
    $.ajax({
      type: 'GET',
      url: '/search',
      data: {
        url: url,
        token: this.state.token
      }
    }).fail(function(){
      dMain('_onSearchClick: search failed. hiding side pane and showing alert');
      // hide side pane
      self.setState({
        results: [],
        searchActive: false
      });
      alert('Search request failed. Please try again.');
    });

    dMain('_onSearchClick: showing results pane');
    // show results pane
    this.setState({
      results: [],
      searchActive: true //!this.state.searchActive
    });
  },
  _onCloseResultsPane: function() {
    var self = this;

    dMain('_onCloseResultsPane: sending request to stop current search (if any) for this client');
    $.ajax({
      type: 'POST',
      url: '/stopSearch',
      data: {
        token: self.state.token
      }
    });

    dMain('_onCloseResultsPane: hiding results pane and resetting results');
    this.setState({
      results: {},
      searchActive: false,
      socket: this.state.socket,
      token: this.state.token
    });
  },
  _onESC: function() {
    dMain('_onESC: ESC key pressed');
    this._onCloseResultsPane();
  },
  getInitialState: function() {
    return {
      results: {},
      searchActive: false,
      socket: void 0,
      token: uuid()
    };
  },
  componentDidMount: function() {
    var socket = io.connect();
    var self = this;

    socket.once('connect', function _onConnect() {
      console.log('schema-check: connected');

      console.log('schema-check: subscribing with token', self.state.token);
      socket.emit('subscribe', self.state.token);

      socket.on('reconnect', function _onReconnect() {
        console.log('schema-check: resubscribing with token', self.state.token);
        socket.emit('subscribe', self.state.token);
        console.log('schema-check: reconnected');
      });

      socket.on('errored', function _onErrored(e) {
        var results = self.state.results;

        if ('HttpError' === e.type || 'RequestError' === e.type){
          dMain('_onErrored: error received', e);

          results[e.input] = results[e.input] || {};
          results[e.input].error = true;
          results[e.input].code = e.code;
          results[e.input].message = e.message;

          self.setState({
            results: results
          });
        }
      });

      socket.on('notFound', function _onNotFound(d) {
        var results = self.state.results;

        dMain('_onNotFound: notFound received', d);
        results[d.url] = results[d.url] || {};
        results[d.url].notFound = true;
        results[d.url].message = d.message;

        self.setState({
          results: results
        });
      });

      socket.on('data', function _onData(d) {
        var results = self.state.results;

        dMain('_onData: data received', d);
        results[d.url] = results[d.url] || {};
        results[d.url].data = d.data;
        self.setState({
          results: results
        });
      });

      socket.on('state', function(s) {
        // if you want to do something with state, do it here
      });

    });

    this.setState({
      socket: socket
    });
  },
  componentWillUnmount: function() {
    console.log('schema-check: app unmounting');
    console.log('schema-check: unsubscribing from backend');
    this.state.socket.emit('unsubscribe', this.state.token);
    console.log('schema-check: app unmounted');
  },
  render: function() {
    dMain('render: Data %o',this.state);
    return (
      <div className="container main-container">
        <div className="row">
          <SearchComponent searchActive = {this.state.searchActive} onSearchClick = {this._onSearchClick} onESC = {this._onESC}/>
          <ResultsComponent searchActive = {this.state.searchActive} results = {this.state.results} onCloseResultsPane = {this._onCloseResultsPane} />
        </div>
      </div>
    );
  }
});

SearchComponent = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  validators: {
    required: function(val, fieldName){
      if (typeof val === 'undefined' || val === ''){
        throw new Error('Required field is absent: '+fieldName);
      }
    },
    urlRegex: /^(https?|ftp):\/\/(-\.)?([^\s/?\.#-]+\.?)+(\/[^\s]*)?$/i,
    validateUrl: function(val, fieldName) {
      if (!this.urlRegex.test(val)) {
        throw new Error('Invalid url');
      }
    }
  },
  _onSearchClick: function() {
    var inputUrl = this.state.url || this.refs['search-box'].getDOMNode().value;

    dSearch('_onSearchClick: search clicked. Input is %s', inputUrl);
    try {
      this.validators.required(inputUrl, 'Search URL');
      this.validators.validateUrl(inputUrl, 'Search URL');
      this.props.onSearchClick(inputUrl);
    }
    catch(e){
      alert(e.message);
      this.refs['search-box'].getDOMNode().focus();
    }
  },
  _onKeyPress: function(e){
    if (13 === e.which) {
      dSearch('_onKeyPress: ENTER key pressed');
      this._onSearchClick();
    }
  },
  _onKeyUp: function(e) {
    if (27 === e.keyCode) {
      dSearch('_onKeyUp: ESC key pressed');
     this.props.onESC();
    }
  },
  componentDidMount: function() {
    this.refs['search-box'].getDOMNode().focus();
  },
  getInitialState: function() {
    return {
      url: ''
    };
  },
  render: function() {
    var cx = React.addons.classSet;
    var classes = cx({
      'columns search-container': true,
      'twelve': !this.props.searchActive,
      'four shrunk': this.props.searchActive
    });

    return (
      <div className={classes}>
        <div className="search-box-container">
          <h3>Check your schema</h3>
          <input className="u-full-width" type="text" placeholder="Enter url" id="search-box" valueLink={this.linkState('url')} onKeyPress = {this._onKeyPress} onKeyUp = {this._onKeyUp} ref="search-box"/>
          <button className="button-primary" id="search" onClick={this._onSearchClick}>Search</button>
        </div>
      </div>
    );
  }

});

ResultsComponent = React.createClass({
  _toggleDetails: function(ref) {
    dRes('_toggleDetails: Ref received %s', ref);
    $(this.refs[ref].getDOMNode()).children('div').toggleClass('hidden').toggleClass('bounceInRight').toggleClass('bounceOutRight');
  },
  _onCloseResultsPane: function(){
    dRes('_onCloseResultsPane: calling method to close results pane');
    this.props.onCloseResultsPane();
  },
  render: function() {
    var cx = React.addons.classSet;
    var classes = cx({
      'columns results-container': true,
      'hidden': !this.props.searchActive,
      'twelve': this.props.searchActive,
      'expand': this.props.searchActive
    });
    var results = [];
    var self = this;

    dRes('render: results object %o', this.props.results);
    Object.keys(this.props.results).forEach(function(url, i){
      var obj = self.props.results[url];
      var dataNodes;
      var pClasses = cx({
        'yellow-bg': obj.error,
        'red-bg': obj.notFound,
        'green-bg': obj.data && Object.keys(obj.data).length
      });
      var detailsClasses = cx({
        'animated hidden bounceOutRight': true
      });
      var liClasses = cx({
        'animated zoomIn': true
      });

      // i is used as a serial number
      // incrementing as its zero indexed and serials are not
      i = i + 1;
      // if error
      if (obj.error){
        results.push (
          <li className={liClasses} key={url}>
            <p className={pClasses}><span className="ellipsis">{i}. {url}</span> <span className="right">Error {obj.code}: {obj.message}</span></p>
          </li>
        );
      }
      // if schema not found
      else if (obj.notFound){
        results.push (
          <li className={liClasses} key={url}>
            <p className={pClasses}><span className="ellipsis">{i}. {url}</span> <span className="right">{obj.message}</span></p>
          </li>
        );
      }
      // if there's data
      else {
        dataNodes = Object.keys(obj.data).map(function(itemtype){
          var dataObj = obj.data[itemtype];
          var itempropNodes = [];

          itempropNodes = Object.keys(dataObj).map(function(itemprop){
            return (<li key={itemprop}>{itemprop} : {dataObj[itemprop]}</li>);
          });
          return (
            <div key={itemtype} className={detailsClasses}>
              <p className="heading">Type</p>
              <p className="type">{itemtype}</p>
              <p className="heading">Data</p>
              <ul>
                {itempropNodes}
              </ul>
            </div>
          );
        });
        results.push(
          <li className={liClasses} key={url} ref={url}>
            <p className={pClasses} onClick={self._toggleDetails.bind(self, url)}>{i}. {url}</p>
            {dataNodes}
          </li>
        );
      }
    });

    return (
      <div className = {classes}>
        <span className="cross" onClick={self._onCloseResultsPane}>x</span>
        <ul className = "results-list">
          {results}
        </ul>
        <LoaderComponent results = {this.props.results} />
      </div>
    );
  }
});

LoaderComponent = React.createClass({
  getInitialState: function() {
    var svg = '';

    svg += '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" stroke="#fff">';
    svg += '  <g fill="none" fill-rule="evenodd" stroke-width="2">';
    svg += '    <circle cx="22" cy="22" r="19.9971">';
    svg += '      <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite" />';
    svg += '      <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite" />';
    svg += '    </circle>';
    svg += '    <circle cx="22" cy="22" r="18.0909">';
    svg += '      <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite" />';
    svg += '      <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite" />';
    svg += '    </circle>';
    svg += '  </g>';
    svg += '</svg>';

    return {
      svg: svg
    };
  },
  render: function() {
    var classes;
    var svg = '';
    var cx = React.addons.classSet;

    classes = cx({
      'loader': true,
      'hidden': Object.keys(this.props.results).length
    });

    return (
      <div className={classes} dangerouslySetInnerHTML={{__html: this.state.svg}} />
    );
  }
});


React.render(<MainComponent token={uuid()} />, document.body);

module.exports = MainComponent;
