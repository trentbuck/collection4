/**
 * collection4 - collection.js
 * Copyright (C) 2010-2013  Florian octo Forster
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor,
 * Boston, MA  02110-1301  USA
 *
 * Authors:
 *   Florian octo Forster <octo at collectd.org>
 **/

var c4 =
{
  instances: new Array (),
  config:
  {
    width: 324,
    height: 200
  }
};

function value_to_string (value) /* {{{ */
{
  var abs_value;
  var v2s = function (value)
  {
    var tmp = Math.round (100.0 * value) / 100.0;
    return ("" + tmp);
  }

  if (value == null)
    return ('NaN');
  else if (value == 0)
    return ('0');

  abs_value = Math.abs (value);

  if ((abs_value < 10000) && (abs_value >= 0.1))
    return (v2s (value));
  else if (abs_value > 1)
  {
    if (abs_value < 10000000)
      return (v2s (value / 1000) + "k");
    else if (abs_value < 10000000000)
      return (v2s (value / 1000000) + "M");
    else if (abs_value < 10000000000000)
      return (v2s (value / 1000000000) + "G");
    else
      return (v2s (value / 1000000000000) + "T");
  }
  else
  {
    if (abs_value >= 0.001)
      return (v2s (value * 1000) + "m");
    else if (abs_value >= 0.000001)
      return (v2s (value * 1000000) + "u");
    else
      return (v2s (value * 1000000000) + "n");
  }
} /* }}} function value_to_string */

function instance_get_params (inst) /* {{{ */
{
  var graph_selector = inst.graph_selector;
  var inst_selector = inst.instance_selector;
  var selector = {};

  if (graph_selector.host == inst_selector.host)
  {
    selector.host = graph_selector.host;
  }
  else
  {
    selector.graph_host = graph_selector.host;
    selector.inst_host = inst_selector.host;
  }

  if (graph_selector.plugin == inst_selector.plugin)
  {
    selector.plugin = graph_selector.plugin;
  }
  else
  {
    selector.graph_plugin = graph_selector.plugin;
    selector.inst_plugin = inst_selector.plugin;
  }

  if (graph_selector.plugin_instance == inst_selector.plugin_instance)
  {
    selector.plugin_instance = graph_selector.plugin_instance;
  }
  else
  {
    selector.graph_plugin_instance = graph_selector.plugin_instance;
    selector.inst_plugin_instance = inst_selector.plugin_instance;
  }

  if (graph_selector.type == inst_selector.type)
  {
    selector.type = graph_selector.type;
  }
  else
  {
    selector.graph_type = graph_selector.type;
    selector.inst_type = inst_selector.type;
  }

  if (graph_selector.type_instance == inst_selector.type_instance)
  {
    selector.type_instance = graph_selector.type_instance;
  }
  else
  {
    selector.graph_type_instance = graph_selector.type_instance;
    selector.inst_type_instance = inst_selector.type_instance;
  }

  return (selector);
} /* }}} instance_get_params */

function ident_clone (ident) /* {{{ */
{
  var ret = {};

  ret.host = ident.host;
  ret.plugin = ident.plugin;
  ret.plugin_instance = ident.plugin_instance;
  ret.type = ident.type;
  ret.type_instance = ident.type_instance;

  return (ret);
} /* }}} ident_clone */

function inst_get_defs (inst) /* {{{ */
{
  if (!inst.def)
  {
    var params = instance_get_params (inst);
    params.action = "graph_def_json";

    $.ajax({
      url: "collection.fcgi",
      async: false,
      dataType: 'json',
      data: params,
      success: function (data)
      {
        if (!data)
          return;

        inst.def = data;
      }});
  }

  if (inst.def)
    return (inst.def);
  return;
} /* }}} inst_get_defs */

function ident_matches (selector, ident) /* {{{ */
{
  var part_matches = function (s,p)
  {
    if (s == null)
      return (false);

    if ((s == "/any/") || (s == "/all/"))
      return (true);

    if (p == null)
      return (false);

    if (s == p)
      return (true);

    return (false);
  };

  if (!part_matches (selector.host, ident.host))
    return (false);

  if (!part_matches (selector.plugin, ident.plugin))
    return (false);

  if (!part_matches (selector.plugin_instance, ident.plugin_instance))
    return (false);

  if (!part_matches (selector.type, ident.type))
    return (false);

  if (!part_matches (selector.type_instance, ident.type_instance))
    return (false);

  return (true);
} /* }}} function ident_matches */

function ident_describe (ident, selector) /* {{{ */
{
  var ret = "";
  var check_field = function (field)
  {
    if (ident[field].toLowerCase () != selector[field].toLowerCase ())
    {
      if (ret != "")
        ret += "/";
      ret += ident[field];
    }
  };

  check_field ("host");
  check_field ("plugin");
  check_field ("plugin_instance");
  check_field ("type");
  check_field ("type_instance");

  if (ret == "")
    return (null);
  return (ret);
} /* }}} function ident_describe */

/*
 * Given one metric definition, returns the appropriate metric data from the
 * graph data (data list). */
function metric_def_get_data (metric_def, graph_data)
{
  var i;

  for (i = 0; i < graph_data.length; i++)
  {
    if ((metric_def.ds_name) && (metric_def.ds_name != graph_data[i].data_source))
      continue;
    if (!ident_matches (metric_def.select, graph_data[i].file))
      continue;

    return (graph_data[i]);
  }
  return;
}

function metric_def_to_rickshaw_series (metric_def, metric_data)
{
  var series = {
    data: []
  };
  var i;

  if (metric_def.legend)
    series.name = metric_def.legend;

  if (metric_def.color)
    series.color = metric_def.color;

  for (i = 0; i < metric_data.data.length; i++)
  {
    var x = metric_data.first_value_time + (i * metric_data.interval);
    var y = metric_data.data[i];

    series.data.push ({'x': x, 'y': y});
  }

  return (series);
}

function graph_def_to_rickshaw_config (root_element, graph_def, data_list)
{
  var graph_config = {
      element: root_element,
      renderer: 'line',
      series: []
  };
  var graph;
  var i;

  for (i = 0; i < graph_def.defs.length; i++)
  {
    var metric_def = graph_def.defs[i];
    var metric_data = metric_def_get_data (metric_def, data_list);
    var series;

    if (!metric_data)
      continue;

    series = metric_def_to_rickshaw_series (metric_def, metric_data);
    if (series)
      graph_config.series.push (series);
  }

  return (graph_config);
}

function graph_def_to_rickshaw_graph (root_element, graph_def, graph_data)
{
  var graph_config = graph_def_to_rickshaw_config (root_element, graph_def, graph_data);

  var graph = new Rickshaw.Graph (graph_config);
  new Rickshaw.Graph.HoverDetail({
    // NOTE: I copied this from https://tech.shutterstock.com/rickshaw/examples/extensions.html
    //       I have *NO IDEA* why it works, but it gives hover dates in local time.
    xFormatter: function(x) { return new Date(x * 1000).toString(); },
    graph: graph});  // allow hovering over a line to label it.
  // FIXME: this is a bodge-arse way to insert a legend element, and it's CSS is missing.
  var legend_element = document.createElement('div');
  root_element.parentNode.insertBefore(legend_element, root_element.nextSibling);
  new Rickshaw.Graph.Legend({graph: graph, element: legend_element});
  graph.render ();

  var x_axis = new Rickshaw.Graph.Axis.Time({
    // This makes the X axis label things in local time instead of UTC.
    // It does NOT affect the labelling of mouseover labels (HoverDetail, above).
    timeFixture: new Rickshaw.Fixtures.Time.Local(),
    graph: graph
  });
  x_axis.render ();

  var y_axis = new Rickshaw.Graph.Axis.Y({
    graph: graph
  });
  y_axis.render ();
}

function inst_draw_rickshaw (inst, graph_def, graph_data)
{
  var root_element = document.getElementById (inst.container);

  inst.chart = graph_def_to_rickshaw_graph (root_element, graph_def, graph_data);
}

function inst_draw (inst, graph_def, graph_data)
{
  inst_draw_rickshaw (inst, graph_def, graph_data);
}

function inst_redraw (inst, graph_def, graph_data) /* {{{ */
{
  var series_array;
  var i;

  if (!inst.chart)
    return (inst_draw (inst, graph_def, graph_data));
  else
    return; /* TODO: Insert new data into the graph */
} /* }}} function inst_redraw */

function inst_fetch_data (inst, begin, end) /* {{{ */
{
  var graph_def;
  var params;

  graph_def = inst_get_defs (inst);
  if (!graph_def)
    return;

  params = instance_get_params (inst);
  params.action = "instance_data_json";
  params.begin = begin || inst.begin;
  params.end = end || inst.end;
  params.resolution = (params.end - params.begin) / c4.config.width;

  $.getJSON ("collection.fcgi", params,
      function (data)
      {
        inst_redraw (inst, graph_def, data);
      }); /* getJSON */
} /* }}} inst_fetch_data */

function json_graph_update (index) /* {{{ */
{
  var inst;

  inst = c4.instances[index];
  if (!inst)
    return;

  if (!inst.container)
    inst.container = "c4-graph" + index;

  inst_fetch_data (inst);
} /* }}} json_graph_update */

function format_instance(inst)
{
  return ("<li class=\"instance\"><a href=\"" + location.pathname
      + "?action=show_instance;" + inst.params + "\">" + inst.description
      + "</a></li>");
}

function format_instance_list(instances)
{
  var ret = "<ul class=\"instance_list\">";
  var i;

  if (instances.length == 0)
    return ("");

  for (i = 0; i < instances.length; i++)
    ret += format_instance (instances[i]);
  
  ret += "</ul>";

  return (ret);
}

function format_graph(graph)
{
  return ("<li class=\"graph\">" + graph.title + format_instance_list (graph.instances) + "</li>");
}

function update_search_suggestions ()
{
  var term = $("#search-input").val ();
  if (term.length < 2)
  {
    $("#search-suggest").hide ();
    return (true);
  }

  $("#search-suggest").show ();
  $.getJSON ("collection.fcgi",
    { "action": "search_json", "q": term},
    function(data)
    {
      var i;
      $("#search-suggest").html ("");
      for (i = 0; i < data.length; i++)
      {
        var graph = data[i];
        $("#search-suggest").append (format_graph (graph));
      }
    }
  );
} /* update_search_suggestions */

function zoom_redraw (jq_obj) /* {{{ */
{
  var url = jq_obj.data ("base_url");

  if ((jq_obj == null) || (url == null))
    return (false);

  if (jq_obj.data ('begin') != null)
    url += ";begin=" + jq_obj.data ('begin');
  if (jq_obj.data ('end') != null)
    url += ";end=" + jq_obj.data ('end');

  jq_obj.attr ("src", url);
  return (true);
} /* }}} function zoom_redraw */

function zoom_reset (graph_id, diff) /* {{{ */
{
  var jq_obj;
  var end;
  var begin;

  jq_obj = $("#" + graph_id);
  if (jq_obj == null)
    return (false);

  end = new Number ((new Date ()).getTime () / 1000);
  begin = new Number (end - diff);

  jq_obj.data ('begin', begin.toFixed (0));
  jq_obj.data ('end', end.toFixed (0));

  return (zoom_redraw (jq_obj));
} /* }}} function zoom_reset */

function zoom_hour (graph_id) /* {{{ */
{
  zoom_reset (graph_id, 3600);
} /* }}} function zoom_hour */

function zoom_day (graph_id) /* {{{ */
{
  zoom_reset (graph_id, 86400);
} /* }}} function zoom_day */

function zoom_week (graph_id) /* {{{ */
{
  zoom_reset (graph_id, 7 * 86400);
} /* }}} function zoom_week */

function zoom_month (graph_id) /* {{{ */
{
  zoom_reset (graph_id, 31 * 86400);
} /* }}} function zoom_month */

function zoom_year (graph_id) /* {{{ */
{
  zoom_reset (graph_id, 366 * 86400);
} /* }}} function zoom_year */

function zoom_relative (graph_id, factor_begin, factor_end) /* {{{ */
{
  var jq_obj;
  var end;
  var begin;
  var diff;

  jq_obj = $("#" + graph_id);
  if (jq_obj == null)
    return (false);

  begin = jq_obj.data ('begin');
  end = jq_obj.data ('end');
  if ((begin == null) || (end == null))
    return (zoom_day (graph_id));

  begin = new Number (begin);
  end = new Number (end);

  diff = end - begin;
  if ((diff <= 300) && (factor_begin > 0.0) && (factor_end < 0.0))
    return (true);

  jq_obj.data ('begin', begin + (diff * factor_begin));
  jq_obj.data ('end', end + (diff * factor_end));

  return (zoom_redraw (jq_obj));
} /* }}} function zoom_relative */

function zoom_reference (graph_id) /* {{{ */
{
  var jq_obj;
  var end;
  var begin;

  jq_obj = $("#" + graph_id);
  if (jq_obj == null)
    return (false);

  begin = jq_obj.data ('begin');
  end = jq_obj.data ('end');
  if ((begin == null) || (end == null))
    return (false);

  $(".graph-img img").each (function ()
  {
    $(this).data ('begin', begin);
    $(this).data ('end', end);
    zoom_redraw ($(this));
  });
} /* }}} function zoom_reference */

function zoom_earlier (graph_id) /* {{{ */
{
  return (zoom_relative (graph_id, -0.2, -0.2));
} /* }}} function zoom_earlier */

function zoom_later (graph_id) /* {{{ */
{
  return (zoom_relative (graph_id, +0.2, +0.2));
} /* }}} function zoom_later */

function zoom_in (graph_id) /* {{{ */
{
  return (zoom_relative (graph_id, +0.2, -0.2));
} /* }}} function zoom_earlier */

function zoom_out (graph_id) /* {{{ */
{
  return (zoom_relative (graph_id, (-1.0 / 3.0), (1.0 / 3.0)));
} /* }}} function zoom_earlier */

function graph_recalc_width () /* {{{ */
{
  var tmp;

  tmp = $("#layout-middle-center").width ();
  if (!tmp)
    return;

  if (tmp < 324)
    tmp = 324;

  c4.config.width = tmp;
  c4.config.height = Math.round (tmp / 1.61803398874989484820);
  $(".graph-json").each (function ()
  {
    $(this).width  (c4.config.width);
    $(this).height (c4.config.height);
  });
} /* }}} function graph_recalc_width */

$(document).ready(function() {
    /* $("#layout-middle-right").html ("<ul id=\"search-suggest\" class=\"graph_list\"></ul>"); */
    $("#search-form").append ("<ul id=\"search-suggest\" class=\"graph_list\"></ul>");
    $("#search-suggest").hide ();

    $("#search-input").blur (function()
    {
      window.setTimeout (function ()
      {
        $("#search-suggest").hide ();
      }, 500);
    });

    $("#search-input").focus (function()
    {
      var term = $("#search-input").val ();
      if (term.length < 2)
      {
        $("#search-suggest").hide ();
      }
      else
      {
        $("#search-suggest").show ();
      }
    });

    $("#search-input").keyup (function()
    {
      update_search_suggestions ();
    });

    var graph_count = 0;
    $(".graph-img").each (function (index, elem)
    {
      var id = "graph" + graph_count;
      graph_count++;

      $(this).find ("img").each (function (img_index, img_elem)
      {
        var base_url;

        $(this).attr ("id", id);

        base_url = $(this).attr ("src").replace (/;(begin|end)=[^;]*/g, '');
        $(this).data ("base_url", base_url);
      });

      $(this).append ("<div class=\"graph-buttons presets\">"
        + "<div class=\"graph-button\" onClick=\"zoom_hour  ('"+id+"');\">H</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_day   ('"+id+"');\">D</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_week  ('"+id+"');\">W</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_month ('"+id+"');\">M</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_year  ('"+id+"');\">Y</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_reference ('"+id+"');\">!</div>"
        + "</div>"
        + "<div class=\"graph-buttons navigation\">"
        + "<div class=\"graph-button\" onClick=\"zoom_earlier ('"+id+"');\">\u2190</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_out     ('"+id+"');\">\u2212</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_in      ('"+id+"');\">+</div>"
        + "<div class=\"graph-button\" onClick=\"zoom_later   ('"+id+"');\">\u2192</div>"
        + "</div>"
        );
    });

    graph_recalc_width ();

    var i;
    for (i = 0; i < c4.instances.length; i++)
    {
      json_graph_update (i);
    }
});

/* vim: set sw=2 sts=2 et fdm=marker : */
