'use strict';

var oncogrid = (function (d3) {
  return function(donors, genes, observations, element, params) {
    this.donors = donors;
    this.genes = genes;
    this.observations = observations;
    this.element = element;
    this.params = params;

    this.heatMap = false; // Heatmap view turned off by default.

    this.colorMap = {
      'missense_variant': '#ff825a',
      'frameshift_variant': '#57dba4',
      'stop_gained': '#af57db',
      'start_lost': '#af57db',
      'stop_lost': '#ffe',
      'initiator_codon_variant': '#af57db',
    };

    var _self = this;

    /**
     * Returns 1 if at least one mutation, 0 otherwise.
     */
    this.mutationScore = function(donor, gene) {

      for (var i = 0; i < _self.observations.length; i++) {
        var obs = _self.observations[i];
        if (obs.donorId === donor && obs.gene === gene) {
          return 1;
        }
      }

      return 0;
    };

    /**
     * Returns 1 if at least one mutation, 0 otherwise.
     */
    this.mutationGeneScore = function(donor, gene) {

      var retVal = 0;
      for (var i = 0; i < _self.observations.length; i++) {
        var obs = _self.observations[i];
        if (obs.gene === gene && obs.gene === gene) {
          retVal++;
        }
      }

      return retVal;
    };

    /**
     * Computes scores for donor sorting.
     */
    this.computeScores = function() {

      for (var i = 0; i < _self.donors.length; i++) {
        var donor = _self.donors[i];
        donor.score = 0;
        for (var j = 0; j < _self.genes.length; j++) {
          var gene = _self.genes[j];
          donor.score += (_self.mutationScore(donor.donorId, gene.id) * Math.pow(2, _self.genes.length + 1 - j));
        }
      }

    };

    this.computeGeneScores = function() {

      for (var i = 0; i < _self.genes.length; i++) {
        var gene = _self.genes[i];
        gene.score = 0;
        for (var j = 0; j < _self.donors.length; j++) {
          var donor = _self.donors[j];
          gene.score += _self.mutationGeneScore(donor.donorId, gene.id);
        }
      }
    };

    /**
     * Comparator for scores
     */
    this.sortScore = function(a, b) {
      if (a.score < b.score) {
        return 1;
      } else if (a.score > b.score) {
        return -1;
      } else {
        return 0;
      }
    };

    /**
     * Sorts donors by score
     */
    this.sortByScores = function() {
      _self.donors.sort(_self.sortScore);
    };

    this.genesSortbyScores = function() {
      _self.genes.sort(_self.sortScore);
    };

    /**
     * Helper for getting donor index position
     */
    this.getDonorIndex = function(donors, donorId) {
      for (var i = 0; i < donors.length; i++) {
        var donor = donors[i];
        if (donor.donorId === donorId) {
          return i;
        }
      }

      return -1;
    };

    /**
     * Initializes and creates the main SVG with rows and columns. Does prelim sort on data
     */
    this.init = function() {

      _self.div = d3.select('body').append('div')
          .attr('class', 'tooltip-oncogrid')
          .style('opacity', 0);

      _self.margin = { top: 10, right: 15, bottom: 15, left: 80 };
      _self.width = _self.params.width;
      _self.height = _self.params.height;


      _self.numDonors = _self.donors.length;
      _self.numGenes = _self.genes.length;

      _self.cellWidth = _self.width / _self.donors.length;
      _self.cellHeight = _self.height / _self.genes.length;

      _self.x = d3.scale.ordinal()
          .domain(d3.range(_self.numDonors))
          .rangeBands([0, _self.width]);

      _self.y = d3.scale.ordinal()
          .domain(d3.range(_self.numGenes))
          .rangeBands([0, _self.height]);

      _self.svg = d3.select(_self.element).append('svg')
          .attr('width', _self.width + _self.margin.left + _self.margin.right)
          .attr('height', _self.height + _self.margin.top + _self.margin.bottom)
          .style('margin-left', _self.margin.left + 'px')
          .append('g')
          .attr('transform', 'translate(' + _self.margin.left + ',' + _self.margin.top + ')');

      _self.svg.append('rect')
          .attr('class', 'background')
          .attr('width', _self.width)
          .attr('height', _self.height);

      _self.row = _self.svg.selectAll('.row')
          .data(_self.genes)
          .enter().append('g')
          .attr('class', 'row')
          .attr('transform', function(d, i) { return 'translate(0,' + _self.y(i) + ')'; });

      _self.row.append('line')
          .attr('x2', _self.width);


      _self.column = _self.svg.selectAll('.column')
          .data(_self.donors)
          .enter().append('g')
          .attr('class', 'column')
          .attr('donor', function(d) { return d.donorId; })
          .attr('transform', function(d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

      _self.column.append('line')
          .attr('x1', -_self.width);

      _self.computeGeneScores();
      _self.computeScores();
      _self.sortByScores();
    };

    /**
     * Only to be called the first time the OncoGrid is rendered. It creates the rects representing the
     * mutation occurrences.
     */
    this.renderFirst = function() {

      _self.row.append('text')
          .attr('class', 'gene-label label-text-font')
          .transition()
          .attr('x', -6)
          .attr('y', _self.cellHeight / 2)
          .attr('dy', '.32em')
          .attr('text-anchor', 'end')
          .text(function(d, i) {
            return _self.genes[i].symbol;
          });

      _self.defineRowDragBehaviour();

      _self.svg.selectAll('svg')
          .data(_self.observations).enter()
          .append('rect')
          .on('mouseover', function(d) {
            _self.div.transition()
                .duration(200)
                .style('opacity', 0.9);
            _self.div.html(d.donorId + '<br/>' + d.gene + '<br/>' + d.id)
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');
          })
          .on('mouseout', function() {
            _self.div.transition()
                .duration(500)
                .style('opacity', 0);
          })
          .on('click', function(d) {
            window.location = '/mutations/' + d.id;
          })
          .transition()
          .attr('class', function(d) { return 'sortable-rect ' + d.donorId + '-cell ' + d.gene + '-cell'; })
          .attr('cons', function(d) { return d.consequence; })
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); })
          .attr('y', function(d) { return _self.getY(d); })
          .attr('width', _self.cellWidth)
          .attr('height', function(d) { return _self.getHeight(d); })
          .attr('fill', function(d) { return _self.getColor(d); })
          .attr('opacity', function(d) { return _self.getOpacity(d); })
          .attr('stroke-width', 2);

      _self.renderAgeHistogram();
    };

    this.renderAgeHistogram = function() {

      if (_self.topSVG === undefined || _self.topSVG === null) {
        _self.topSVG = d3.select('#oncogrid-topcharts').append('svg')
            .attr('width', _self.width + _self.margin.left + _self.margin.right)
            .attr('height', 100)
            .style('margin-left', _self.margin.left + 'px')
            .append('g')
            .attr('transform', 'translate(' + _self.margin.left + ',' + _self.margin.top + ')');
      }

      _self.topSVG.selectAll('rect')
          .data(_self.donors)
          .enter()
          .append('rect')
          .on('mouseover', function(d) {
            _self.div.transition()
                .duration(200)
                .style('opacity', 0.9);
            _self.div.html('Donor: ' + d.donorId + '<br/> Age:' + d.age + '<br/>')
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');
          })
          .on('mouseout', function() {
            _self.div.transition()
                .duration(500)
                .style('opacity', 0);
          })
          .transition()
          .attr('class', function(d) { return 'sortable-bar ' + d.donorId+'-bar'; })
          .attr('width', _self.cellWidth - 2)
          .attr('height', function(d) { return d.age; })
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)) + 1; })
          .attr('y', function(d) { return 100 - d.age; })
          .attr('fill', '#1693C0');

    };


    /**
     * Defines the row drag behaviour for moving genes and binds it to the row elements.
     */
    this.defineRowDragBehaviour = function() {

      var drag = d3.behavior.drag();
      drag.on('dragstart', function() {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
      });
      drag.on('drag', function(d) {
        var trans = d3.event.dy;
        var dragged = genes.indexOf(d);
        var selection = d3.select(this);

        selection.attr('transform', function() {
          var transform = d3.transform(d3.select(this).attr('transform'));
          return 'translate( 0, ' + (parseInt(transform.translate[1]) + trans) + ')';
        });

        var newY = d3.transform(d3.select(this).attr('transform')).translate[1];

        d3.selectAll('.row').each(function(f) {
          var curGeneIndex = genes.indexOf(f);
          var curGene, yCoord;
          if (trans > 0 && curGeneIndex > dragged) {
            yCoord = d3.transform(d3.select(this).attr('transform')).translate[1];
            if (newY > yCoord) {
              curGene = genes[dragged];
              genes[dragged] = genes[curGeneIndex];
              genes[curGeneIndex] = curGene;
            }
          } else if (trans < 0 && curGeneIndex < dragged) {
            yCoord = d3.transform(d3.select(this).attr('transform')).translate[1];
            if (newY < yCoord) {
              curGene = genes[dragged];
              genes[dragged] = genes[curGeneIndex];
              genes[curGeneIndex] = curGene;
            }
          }
        });

      });

      drag.on('dragend', function() {
        _self.computeScores();
        _self.sortByScores();
        _self.render();
      });

      var dragSelection = d3.selectAll('.row').call(drag);
      dragSelection.on('click', function() {
        if (d3.event.defaultPrevented) {
          return;
        }
      });

    };

    this.cluster = function() {


      _self.computeGeneScores();
      _self.genesSortbyScores();
      _self.computeScores();
      _self.sortByScores();
      _self.render();
    };

    /**
     * Render function ensures presentation matches the data. Called after modifying data.
     */
    this.render = function() {


      d3.selectAll('.row')
          .transition()
          .attr('transform', function(d) {
            return 'translate( 0, ' + _self.y(_self.genes.indexOf(d)) + ')';
          });

      d3.selectAll('.sortable-rect')
          .transition()
          .attr('y', function(d) {
            return _self.getY(d);
          })
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });

      _self.topSVG.selectAll('rect')
          .transition()
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)) + 1; });
    };

    /**
     * Function that determines the y position of a mutation within a cell
     */
    this.getY = function(d) {

      var pseudo_genes = _self.genes.map(function(g) {
        return g.id;
      });

      if (_self.heatMap === true) {
        return _self.y(pseudo_genes.indexOf(d.gene));
      }

      var keys = Object.keys(_self.colorMap);
      return  _self.y(pseudo_genes.indexOf(d.gene)) + (_self.cellHeight / keys.length) *
          (keys.indexOf(d.consequence) - 1);
    };

    this.getColor = function(d) {


      if (_self.heatMap === true) {
        return '#D33682';
      } else {
        return _self.colorMap[d.consequence];
      }
    };

    this.getOpacity = function() {


      if (_self.heatMap === true) {
        return 0.3;
      } else {
        return 1;
      }
    };

    this.getHeight = function() {


      if (_self.heatMap === true) {
        return _self.cellHeight;
      } else {
        return _self.cellHeight / Object.keys(_self.colorMap).length;
      }
    };

    this.toggleHeatmap = function() {

      if (_self.heatMap === true) {
        _self.heatMap = false;
      } else {
        _self.heatMap = true;
      }

      d3.selectAll('.sortable-rect')
          .transition()
          .attr('y', function(d) {
            return _self.getY(d);
          })
          .attr('height', function(d) { return _self.getHeight(d); })
          .attr('fill', function(d) { return _self.getColor(d); })
          .attr('opacity', function(d) { return _self.getOpacity(d); });
    };

    this.removeDonors = function(func) {


      var removedList = [];

      // Remove donors from data
      for (var i = 0; i < _self.donors.length; i++) {
        var donor = _self.donors[i];
        if (func(donor)) {
          removedList.push(donor.donorId);
          d3.selectAll('.' + donor.donorId + '-cell').remove();
          d3.selectAll('.' + donor.donorId + '-bar').remove();
          _self.donors.splice(i, 1);
          i--;
        }
      }

      for (var j = 0; j < _self.observations.length; j++) {
        var obs = _self.observations[j];
        if (_self.donors.indexOf(obs.donorId) >= 0) {
          _self.observations.splice(j, 1);
          j--;
        }
      }

      _self.x = d3.scale.ordinal()
          .domain(d3.range(_self.donors.length))
          .rangeBands([0, _self.width]);
      _self.cellWidth = _self.width / _self.donors.length;

      _self.column.remove();

      _self.column = _self.svg.selectAll('.column')
          .data(_self.donors)
          .enter().append('g')
          .attr('class', 'column')
          .attr('donor', function(d) { return d.donorId; })
          .attr('transform', function(d, i) { return 'translate(' + _self.x(i) + ')rotate(-90)'; });

      _self.column.append('line')
          .attr('x1', -_self.width);

      d3.selectAll('.sortable-rect')
          .transition()
          .attr('width', _self.cellWidth)
          .attr('y', function(d) {
            return _self.getY(d);
          })
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });

      d3.selectAll('.sortable-bar')
          .transition()
          .attr('width', _self.cellWidth - 2)
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)) + 1; });
    };

    this.removeGenes = function(func) {

      var removedList = [];

      // Remove genes from data
      for (var i = 0; i < _self.genes.length; i++) {
        var gene = _self.genes[i];
        if (func(gene)) {
          removedList.push(gene.id);
          d3.selectAll('.' + gene.id + '-cell').remove();
          _self.genes.splice(i, 1);
          i--;
        }
      }

      _self.y = d3.scale.ordinal()
          .domain(d3.range(_self.genes.length))
          .rangeBands([0, _self.height]);
      _self.cellHeight = _self.height / _self.genes.length;

      _self.row.remove();

      _self.row = _self.svg.selectAll('.row')
          .data(_self.genes)
          .enter().append('g')
          .attr('class', 'row')
          .attr('transform', function(d, i) { return 'translate(0,' + _self.y(i) + ')'; });

      _self.row.append('line')
          .attr('x2', _self.width);

      _self.row.append('text')
          .attr('class', 'gene-label label-text-font')
          .transition()
          .attr('x', -6)
          .attr('y', _self.cellHeight / 2)
          .attr('dy', '.32em')
          .attr('text-anchor', 'end')
          .text(function(d, i) {
            return _self.genes[i].symbol;
          });

      _self.defineRowDragBehaviour();

      d3.selectAll('.sortable-rect')
          .transition()
          .attr('height', function(d){ return _self.getHeight(d); })
          .attr('y', function(d) {
            return _self.getY(d);
          })
          .attr('x', function(d) { return _self.x(_self.getDonorIndex(_self.donors, d.donorId)); });
    };

    this.sortDonors = function(func) {

      _self.donors.sort(func);
      _self.render();
    };

    this.destroy = function() {
      d3.selectAll('svg').remove();
      d3.select('#oncogrid-topcharts').select('svg').remove();
      delete _self.svg;
      delete _self.topSVG;
    };

    return this;
  };
}(d3));