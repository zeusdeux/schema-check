var React = require('react/addons');
var $     = require('jquery');
var uuid  = require('node-uuid').v4;
var MainComponent;
var SearchComponent;
var LoaderComponent;
var ResultsComponent;


MainComponent = React.createClass({
  getInitialState: function() {
    return {
      results: [],
      searchActive: false
    };
  },
  _onSearchClick: function(url){
    this.setState({
      results: [],
      searchActive: !this.state.searchActive
    });
    //make ajax request with this.props.token, url
  },
  render: function(){
    return (
      <div className="container main-container">
        <div className="row">
          <SearchComponent searchActive = {this.state.searchActive} onSearchClick = {this._onSearchClick} />
          <ResultsComponent searchActive = {this.state.searchActive} />
        </div>
      </div>
    );
  }

});

SearchComponent = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  _onSearchClick: function(){
    this.props.onSearchClick(this.state.url);
  },
  getInitialState: function() {
    return {
      url: ''
    };
  },
  render: function(){
    var cx = React.addons.classSet;
    var classes = cx({
      'columns search-container': true,
      'twelve': !this.props.searchActive,
      'four shrunk': this.props.searchActive
    });

    return (
      <div className={classes}>
        <div className="search-box-container">
          <h3>Check your schema moron</h3>
          <input className="u-full-width" name="" type="text" placeholder="Enter url" id="search-box" valueLink={this.linkState('url')}/>
          <button className="button-primary" id="search" onClick={this._onSearchClick}>Search</button>
        </div>
      </div>
    );
  }

});

ResultsComponent = React.createClass({
  render: function() {
    var cx = React.addons.classSet;
    var classes = cx({
      'columns results-container': true,
      'hidden': !this.props.searchActive,
      'eight': this.props.searchActive
    });

    return (
      <div className={classes}>
        <LoaderComponent />
      </div>
    );
  }

});

LoaderComponent = React.createClass({
  render: function(){
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

    return (
      <div className="loader" dangerouslySetInnerHTML={{__html: svg}} />
    );
  }
});


React.render(<MainComponent token={uuid()} />, document.body);

module.exports = MainComponent;
