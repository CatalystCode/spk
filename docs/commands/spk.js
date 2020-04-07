/* eslint-disable */
var data = null;
var filter = "";
var converter = new showdown.Converter();
var releases = ["master"];
var version = "master";
var sepVersion = "@";

var template =
  '<p class="cmd-title">@@main-cmd@@</p><p class="cmd-description">@@cmd-description@@</p><p>&nbsp;</p><p>Options:</p>@@options@@<p>&nbsp;</p>';
var optionTemplate =
  '<p>@@option@@</p><p class="cmd-description">@@description@@</p>@@inherit@@<div class="line-space"></div>';
var inheritTemplate =
  '<p class="cmd-inherit">inherit @@inherit@@ from spk config.yaml</p>';
var relTemplate =
  '<li><a class="preserve-view button is-small has-border-none has-inner-focus has-flex-justify-content-start is-full-width has-text-wrap is-text-left">@@value@@</a></li>';
var changeTemplate =
  '<div class="change-container"><div class="change-header">@@version@@</div><div class="change-content">@@changes@@</div></div>';
var commandAddedTemplate =
  '<div class="change-item-header">Commands Added</div><ul class="change-list">@@changes@@</ul>';
var commandRemovedTemplate =
  '<div class="change-item-header">Commands Removed</div><ul class="change-list">@@changes@@</ul>';
var commandValueChangedTemplate =
  '<div class="change-option-header">Command Values Changed</div><ul class="change-list">@@changes@@</ul>';
var optionAddedTemplate =
  '<div class="change-option-header">Options Added</div><ul class="change-list">@@changes@@</ul>';
var optionRemovedTemplate =
  '<div class="change-option-header">Options Removed</div><ul class="change-list">@@changes@@</ul>';
var optionChangedTemplate =
  '<div class="change-option-header">Options Changed</div><ul class="change-list">@@changes@@</ul>';

var dataCache = {};

function argToVariableName(arg) {
  var match = arg.match(/\s?--([-\w]+)\s?/);
  if (match) {
    return match[1]
      .replace(/\.?(-[a-z])/g, (_, y) => {
        return y.toUpperCase();
      })
      .replace(/-/g, "");
  }
  return null;
}

function showChangesView() {
  $("#content").css("display", "none");
  $("#changes").css("display", "flex");
}

function showCommandView() {
  $("#content").css("display", "flex");
  $("#changes").css("display", "none");
}

function sanitize(str) {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getExistingVersions() {
  $.ajax({
    url: "releases.txt",
    success: function (result) {
      result.split("\n").forEach(function (r) {
        var rTrim = r.trim();
        if (rTrim && releases.indexOf(rTrim) === -1) {
          releases.push(rTrim);
        }
      });
      releases.sort(function (a, b) {
        return a > b ? -1 : 1;
      });
    },
    async: false,
  });
}

function getVersion() {
  if (window.location.hash) {
    var val = window.location.hash.substring(1); // remove #
    var idx = val.indexOf(sepVersion);
    if (idx !== -1) {
      ver = val.substring(0, idx).trim();
      if (releases.indexOf(ver) !== -1) {
        version = ver;
        return;
      }
    }
  }
  version = "master";
}

function populateVersionList() {
  var oSelect = $("#ulReleases");
  oSelect.html(
    releases.reduce((a, c) => {
      return a + relTemplate.replace("@@value@@", c);
    }, "")
  );
  oSelect.find("li").each(function (i, elm) {
    $(elm).on("click", function (evt) {
      evt.stopPropagation();
      oSelect.css("display", "none");
      var ver = $(this).text();
      if (ver !== version) {
        version = ver;
        $("#selectedRelease").text(version);
        loadCommands();
      }
    });
  });
}

function showDetails(key) {
  if (!key) {
    window.location.hash = "#" + version + sepVersion;
    $("#spk-details").html("");
    return;
  }
  window.location.hash = version + sepVersion + key.replace(/\s/g, "_");
  var cmd = data[key];
  var valuesArray = cmd.command.split(/\s/);
  var values = "";
  if (valuesArray.length > 1) {
    valuesArray.shift();
    values = " " + valuesArray.join(" ");
  }
  var alias = cmd.alias ? `|${cmd.alias}` : "";
  var content = template.replace(
    "@@main-cmd@@",
    "spk " + key + alias + sanitize(values) + " [options]"
  );
  content = content.replace("@@cmd-description@@", cmd.description);

  var options = (cmd.options || []).reduce(function (a, c) {
    var o = optionTemplate
      .replace("@@option@@", sanitize(c.arg))
      .replace("@@description@@", sanitize(c.description));

    if (c.inherit) {
      o = o.replace(
        "@@inherit@@",
        inheritTemplate.replace("@@inherit@@", c.inherit)
      );
    } else {
      o = o.replace("@@inherit@@", "");
    }

    a += o;
    return a;
  }, "");
  options += optionTemplate
    .replace("@@option@@", "-h, --help")
    .replace("@@description@@", "output usage information")
    .replace("@@inherit@@", "");

  content = content.replace("@@options@@", options);

  if (cmd.markdown) {
    content =
      '<p class="cmd-title1">@@main-cmd@@</p>'.replace(
        "@@main-cmd@@",
        "spk " + key
      ) +
      '<div class="markdown">' +
      converter.makeHtml(cmd.markdown) +
      "</div><hr>" +
      content;
  }

  $("#spk-details").html(content);
}

function populateListing() {
  var cmdKeys = Object.keys(data);
  if (filter) {
    cmdKeys = cmdKeys.filter(function (k) {
      return k.indexOf(filter) !== -1;
    });
  }
  var listing = cmdKeys.reduce(function (a, c) {
    a +=
      "<li><a href=\"javascript:showDetails('" +
      c +
      "');\">spk " +
      c +
      "</a></li>";
    return a;
  }, "");

  if (listing) {
    $("#command-list").html("<ul>" + listing + "</ul>");
  } else {
    $("#command-list").html(
      '<span class="small-font">no matching commands</span>'
    );
  }
  if (window.location.hash) {
    var hashTag = window.location.hash.substring(1); // remove #
    var idx = hashTag.indexOf(sepVersion);
    if (idx !== -1) {
      hashTag = hashTag.substring(idx + 1);
    }
    var key = hashTag.replace(/_/g, " ");
    if (cmdKeys.indexOf(key) !== -1) {
      showDetails(key);
    } else {
      showDetails(cmdKeys[0]);
    }
  } else {
    showDetails(cmdKeys[0]);
  }
}

var subheaderItems = function () {
  $("#item_share").click(function (evt) {
    evt.stopPropagation();
    $("#sharing-menu").css("display", "block");
  });
  $("body").click(function () {
    $("#sharing-menu").css("display", "none");
  });
  $("#item_contribute").click(function (evt) {
    var win = window.open("https://github.com/CatalystCode/spk", "_blank");
    win.focus();
  });
};

function fetchData(version, fn) {
  if (version in dataCache) {
    fn(dataCache[version]);
  } else {
    var url =
      version === "master" ? "./data.json" : "./data" + version + ".json";

    $.getJSON(url, function (json) {
      dataCache[version] = json;
      fn(json);
    });
  }
}

function compareVersionDiff(prev, cur) {
  var prevKeys = Object.keys(prev);
  var results = Object.keys(cur).filter(function (k) {
    return prevKeys.indexOf(k) === -1;
  });
  return results.length > 0 ? results : undefined;
}

function compareArgsDiff(prev, cur) {
  var prevKeys = prev.map(function (opt) {
    return opt.arg;
  });

  return cur
    .filter(function (opt) {
      return prevKeys.indexOf(opt.arg) === -1;
    })
    .map(function (opt) {
      return opt.arg;
    });
}

function compareArgsChanged(prev, cur) {
  var optionsPrev = prev.options || [];
  var optionsCur = cur.options || [];
  var changes = {};
  var aliases = {};
  var aliasChanged = [];
  var aliasesRm = {};

  var removed = compareArgsDiff(optionsCur, optionsPrev);
  if (removed.length > 0) {
    removed.forEach(function (r) {
      var m = r.match(/^-([a-zA-Z]),\s/);
      if (m) {
        var varName = argToVariableName(r);
        aliases[varName] = m[1];
        aliasesRm[varName] = r;
      }
    });
  }

  // to figure out the change in options by comparing
  // old vs new
  var added = (compareArgsDiff(optionsPrev, optionsCur) || []).filter(function (
    add
  ) {
    var m = add.match(/^-([a-zA-Z]),\s/);
    if (m) {
      var varName = argToVariableName(add);
      if (varName in aliases) {
        var idx = removed.indexOf(aliasesRm[varName]);
        removed.splice(idx, 1);
        aliasChanged.push(
          'change "' + aliasesRm[varName] + '" to "' + add + '"'
        );
        return false;
      }
    }
    return true;
  });

  if (removed.length > 0) {
    changes.removed = removed;
  }

  if (added.length > 0) {
    changes.added = added;
  }

  if (aliasChanged.length > 0) {
    changes.changed = aliasChanged;
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

function compareVersionChanged(prev, cur) {
  var changes = {};
  var curKeys = Object.keys(cur);
  var commonKeys = Object.keys(prev).filter(function (k) {
    return curKeys.indexOf(k) !== -1;
  });

  commonKeys.forEach(function (k) {
    var newCmd = cur[k];
    var prevCmd = prev[k];
    var modified = {};

    if (newCmd.command !== prevCmd.command) {
      modified["command"] = prevCmd.command + " to " + newCmd.command;
    }

    if (newCmd.alias !== prevCmd.alias) {
      modified["alias"] = {
        prev: prevCmd.alias,
        newCmd: newCmd.alias,
      };
    }

    var optChanges = compareArgsChanged(prevCmd, newCmd);

    if (optChanges) {
      modified.options = optChanges;
    }

    if (Object.keys(modified).length > 0) {
      changes[k] = modified;
    }
  });

  return Object.keys(changes).length > 0 ? changes : undefined;
}

function compareVersion(prev, cur) {
  var prevData = dataCache[prev];
  var curData = dataCache[cur];
  var data = {};

  var added = compareVersionDiff(prevData, curData);
  if (added) {
    data.added = added;
  }

  var removed = compareVersionDiff(curData, prevData);
  if (removed) {
    data.removed = removed;
  }

  var changed = compareVersionChanged(prevData, curData);
  if (changed) {
    data.changed = changed;
  }

  return Object.keys(data).length > 0 ? data : undefined;
}

function compareVersions() {
  var versions = Object.keys(dataCache);
  versions.sort();
  var cur = versions.shift();
  var dataChanges = {};

  versions.forEach(function (ver) {
    dataChanges[ver] = compareVersion(cur, ver);
    cur = ver;
  });
  versions.reverse();

  $("#changes").append(
    versions
      .map(function (v) {
        var oChanges = dataChanges[v];
        var changes = "no changes";
        if (oChanges) {
          changes = "";
          if (oChanges.added) {
            changes = commandAddedTemplate.replace(
              "@@changes@@",
              oChanges.added
                .map(function (add) {
                  return "<li>spk " + sanitize(add) + "</li>";
                })
                .join("")
            );
          }
          if (oChanges.removed) {
            changes += commandRemovedTemplate.replace(
              "@@changes@@",
              oChanges.removed
                .map(function (rm) {
                  return "<li>spk " + sanitize(rm) + "</li>";
                })
                .join("")
            );
          }
          if (oChanges.changed) {
            var optionChanges = "";
            Object.keys(oChanges.changed).forEach(function (k) {
              optionChanges +=
                '<div class="option-change"><div class="option-change-title">' +
                k +
                "</div>";

              if (oChanges.changed[k].command) {
                optionChanges += commandValueChangedTemplate.replace(
                  "@@changes@@",
                  sanitize(oChanges.changed[k].command)
                );
              }

              if (oChanges.changed[k].options) {
                var options = oChanges.changed[k].options;

                if (options.added) {
                  optionChanges += optionAddedTemplate.replace(
                    "@@changes@@",
                    options.added
                      .map(function (add) {
                        return "<li>" + sanitize(add) + "</li>";
                      })
                      .join("")
                  );
                }
                if (options.removed) {
                  optionChanges += optionRemovedTemplate.replace(
                    "@@changes@@",
                    options.removed
                      .map(function (rm) {
                        return "<li>" + sanitize(rm) + "</li>";
                      })
                      .join("")
                  );
                }
                if (options.changed) {
                  optionChanges += optionChangedTemplate.replace(
                    "@@changes@@",
                    options.changed
                      .map(function (chg) {
                        return "<li>" + sanitize(chg) + "</li>";
                      })
                      .join("")
                  );
                }
              }
              optionChanges += "</div>";
            });

            changes +=
              '<div class="change-item-header">Commands Changed</div>' +
              optionChanges;
          }
        }
        return changeTemplate
          .replace("@@version@@", v)
          .replace("@@changes@@", changes);
      })
      .join("")
  );
}

function fetchAllData() {
  var cached = Object.keys(dataCache);
  var missings = releases.filter(function (r) {
    return cached.indexOf(r) === -1;
  });
  var cnt = missings.length;
  missings.forEach(function (miss) {
    fetchData(miss, function () {
      cnt--;
      if (cnt === 0) {
        compareVersions();
      }
    });
  });
}

function loadCommands() {
  fetchData(version, function (json) {
    data = json;
    subheaderItems();
    populateListing();

    $("#commandfilter").on("input", function () {
      filter = $(this).val().trim().toLowerCase();
      populateListing();
    });
    fetchAllData();
  });
}

function showReleaseSelector(bShow) {
  var selector = $("#ulReleases");
  if (bShow === undefined) {
    bShow = selector.css("display") === "none";
  }
  $("#ulReleases").css("display", bShow ? "block" : "none");
  var indicator = $("#btnSelectRelease").find(".expanded-indicator");
  if (bShow) {
    indicator.removeClass("docon-chevron-down-light");
    indicator.addClass("docon-chevron-up-light");
  } else {
    indicator.removeClass("docon-chevron-up-light");
    indicator.addClass("docon-chevron-down-light");
  }
}

$(function () {
  $("#btnSelectRelease").on("click", function (evt) {
    evt.stopPropagation();
    showReleaseSelector();
  });
  $(document.body).on("click", function () {
    showReleaseSelector(false);
  });
  $(document).keyup(function (evt) {
    if (evt.keyCode === 27) {
      showReleaseSelector(false);
    }
  });
  getExistingVersions();
  getVersion();
  $("#selectedRelease").text(version);
  populateVersionList();
  loadCommands();
});
