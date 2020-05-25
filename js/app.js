/*
  github-label-manager is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  github-label-manager is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with github-label-manager.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

$(document).ready(function () {
  let targetUsername;
  let targetRepo;
  let targetOwner;
  let isLoadingShown = false;

  let loadingSemaphore = (function () {
    let count = 0;

    return {
      acquire: function () {
        // console.log("acq " + count);
        ++count;
        return null;
      },
      release: function () {
        // console.log("rel " + count);
        if (count <= 0) {
          throw "Semaphore inconsistency";
        }

        --count;
        return null;
      },
      isLocked: function () {
        return count > 0;
      }
    };
  }());

  $.ajaxSetup({
    cache: false,
    complete: function () {
      loadingSemaphore.release();
      if (isLoadingShown && loadingSemaphore.isLocked() === false) {
        writeLog("All operations are done.");

        //add close button
        $('#loadingModal .modal-content').append('<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">Close</span></button></div>');
      }
    },
    beforeSend: function (xhr) {
      let password = $('#personalAccessToken').val().trim();
      loadingSemaphore.acquire();
      // only add authorization if a password is provided. Adding empty authorization header
      // fails loading for public repos
      if (password) {
        xhr.setRequestHeader('Authorization', makeBasicAuth(targetUsername, password));
      }
    }
  });

  function apiCallGetEntriesRecursive(username, repo, kind, mode, callback, pageNum) {
    $.ajax({
      type: 'GET',
      url: 'https://api.github.com/repos/' + username + '/' + repo + '/' + kind + '?page=' + pageNum,
      success: function (response) {
        if (response) {
          response.forEach(e => {
            if (kind === 'labels') {
              e.color = e.color.toUpperCase();
              createNewLabelEntry(e, mode);
            }
            else if (kind === 'milestones') {
              createNewMilestoneEntry(e, mode)
            }
            else {
              console.log('Bug in function apiCallGetEntriesRecursive!');
            }
            //sets target indicator text
            $('#which-repo-in-use').html('<strong>Repo owner:</strong> ' + targetOwner + "<br /><strong>Repo:</strong> " + targetRepo + '<br /><strong>Username:</strong> ' + username);
          });
        }//if

        if (typeof callback === 'function') {
          callback(response);
        }

        if (response.length === 0) {
          if (pageNum === 1) {
            alert('No ' + kind + ' exist within this repo!');
          }
          return;
        }
        else {
          apiCallGetEntriesRecursive(username, repo, kind, mode, callback, ++pageNum);
        }

      },
      error: function (response) {
        if (response.status === 404) {
          alert('Not found! If this is a private repo make sure you provide a password.');
        }

        if (typeof callback === 'function') {
          callback(response);
        }
      }
    });
  }

  function apiCallGetEntries(username, repo, kind, mode, callback) {
    apiCallGetEntriesRecursive(username, repo, kind, mode, callback, 1);
    checkIfAnyActionNeeded();
  }

  function assignAPICallSign(entryObject, kind) {
    let apiCallSign;
    if (kind === 'labels') {
      apiCallSign = entryObject.name;
    }
    else if (kind === 'milestones') {
      apiCallSign = entryObject.number;
    }
    else {
      apiCallSign = 'There\'s a bug in function assignAPICallSign!';
    }
    console.log(apiCallSign);
    return apiCallSign;
  };

  function assignNameForEntry(entryObject, kind) {
    let nameForEntry;
    if (kind === 'labels') {
      nameForEntry = entryObject.name;
    }
    else if (kind === 'milestones') {
      nameForEntry = entryObject.title;
    }
    else {
      nameForEntry = 'There\'s a bug in function assignAPICallSign!';
    }
    console.log(nameForEntry);
    return nameForEntry;
  };

  function apiCallCreateEntries(entryObject, kind, callback) {
    let nameForEntry = assignNameForEntry(entryObject, kind);
    
    $.ajax({
      type: "POST",
      url: 'https://api.github.com/repos/' + targetOwner + '/' + targetRepo + '/' + kind,
      data: JSON.stringify(entryObject),
      success: function (response) {
        // console.log("success: ");
        // console.log(response);
        if (typeof callback === 'function') {
          callback(response);
        }
        writeLog('Created ' + kind + ': ' + nameForEntry);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        writeLog('Creation of ' + kind + ' failed for: ' + nameForEntry + ' Error: ' + errorThrown);
      }
    });
  }

  function apiCallUpdateEntries(entryObject, kind, callback) {
    let originalEntry;

    if (kind === 'labels') {
      originalEntry = entryObject.originalName;
      delete entryObject.originalName;
    }
    else if (kind === 'milestones') {
      originalEntry = entryObject.number;
    }

    $.ajax({
      type: "PATCH",
      url: 'https://api.github.com/repos/' + targetOwner + '/' + targetRepo + '/' + kind + '/' + originalEntry,
      data: JSON.stringify(entryObject),
      success: function (response) {
        // console.log("success: ");
        // console.log(response);
        if (typeof callback === 'function') {
          callback(response);
        }
        let apiCallSign = assignAPICallSign(entryObject, kind);
        writeLog('Updated ' + kind + ': ' + originalEntry + ' => ' + apiCallSign);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        writeLog('Update of' + kind + 'failed for: ' + originalEntry + ' Error: ' + errorThrown);
      }
    });
  }

  function apiCallDeleteEntries(entryObject, kind, callback) {
    let apiCallSign = assignAPICallSign(entryObject, kind);
    let nameForEntry = assignNameForEntry(entryObject, kind);

    $.ajax({
      type: "DELETE",
      url: 'https://api.github.com/repos/' + targetOwner + '/' + targetRepo + '/' + kind + '/' + apiCallSign,
      success: function (response) {
        // console.log("success: ");
        // console.log(response);
        if (typeof callback === 'function') {
          callback(response);
        }
        writeLog('Deleted ' + kind + 'numbered: ' + nameForEntry);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        writeLog('Deletion of label failed for: ' + nameForEntry + ' Error: ' + errorThrown);
      }
    });
  }

  function makeBasicAuth(username, password) {
    return "Basic " + Base64.encode(username + ":" + password);
  }

  // Labels

  function clearAllLabels() {
    $('#form-labels').text('');
    $('#commit-to-target-repo').text('Commit changes');
    $('#commit-to-target-repo').attr('disabled', 'disabled');
  }

  function createNewLabelEntry(label, mode) {

    let action = ' action="none" ';
    let uncommittedSignClass = '';

    if (mode === 'copy' || mode === 'new') {
      action = ' action="create" new="true" ';
      uncommittedSignClass = ' uncommitted ';
    }

    if (label === undefined || label === null) {
      label = {
        name: '',
        color: '',
        description: ''
      };
    }

    let origNameVal = ' orig-val="' + label.name + '"';
    let origColorVal = ' orig-val="' + label.color + '"';
    let origDescriptionVal = ' orig-val="' + label.description + '"';

    let newElementEntry = $('\
      <div class="label-entry ' + uncommittedSignClass + '" ' + action + '>\
      <input name="name" type="text" class="form-control input-sm label-fitting" placeholder="Name" value="' + label.name + '" ' + origNameVal + '>\
      <span class="sharp-sign">#</span>\
      <input name="color" type="text" class="form-control input-sm color-fitting color-box" placeholder="Color"  value="' + label.color + '" ' + origColorVal + '>\
      <button type="button" class="btn btn-danger delete-button"><i class="fas fa-trash-alt"></i></button>\
      <button type="button" class="btn btn-success hidden recover-button"><i class="fas fa-history"></i></button>\
      <input name="description" type="text" class="form-control input-sm description-fitting" placeholder="Description" value="' + label.description + '" ' + origDescriptionVal + '>\
      </div>\
    ');

    newElementEntry.children('.color-box').css('background-color', '#' + label.color);

    newElementEntry.children(':input[orig-val]').change(function () {

      if ($(this).val() === $(this).attr('orig-val')) {//unchanged
        $(this).parent().attr('action', 'none');
        $(this).parent().removeClass('uncommitted');
      }
      else {//changed
        if ($(this).parent().attr('new') === 'true') {
          $(this).parent().attr('action', 'create');
        }
        else {
          $(this).parent().attr('action', 'update');
        }
        $(this).parent().addClass('uncommitted');
      }

      checkIfAnyActionNeeded();
      return;
    });

    //Delete button
    newElementEntry.children('.delete-button').click(function () {
      if ($(this).parent().attr('new') === 'true') {
        $(this).parent().remove();
      }
      else {
        $(this).siblings().addClass('deleted');
        $(this).siblings().attr('disabled', 'true');
        $(this).siblings('.recover-button').removeAttr('disabled');
        $(this).addClass('hidden');
        $(this).parent().attr('action', 'delete');
      }


      $(this).siblings('.recover-button').removeClass('hidden');

      checkIfAnyActionNeeded();
      return;
    });

    newElementEntry.children('.recover-button').click(function () {
      $(this).siblings().removeClass('deleted');
      $(this).siblings().removeAttr('disabled');
      $(this).siblings('.delete-button').removeClass('hidden');
      $(this).addClass('hidden');

      if ($(this).siblings('[name="name"]').attr('orig-val') === $(this).siblings('[name="name"]').val() &&
        $(this).siblings('[name="color"]').attr('orig-val') === $(this).siblings('[name="color"]').val()) {
        $(this).parent().attr('action', 'none');
      }
      else {
        $(this).parent().attr('action', 'update');
      }

      checkIfAnyActionNeeded();
    });

    //activate color picker on color-box field
    newElementEntry.children('.color-box').ColorPicker({
      //http://www.eyecon.ro/colorpicker
      color: label.color,
      onSubmit: function (hsb, hex, rgb, el) {
        $(el).val(hex.toUpperCase());
        $(el).ColorPickerHide();
        $(el).css('background-color', '#' + hex);

        //-----------------------------
        //well here goes the copy-paste because normal binding to 'change' doesn't work
        // on newElementEntry.children().filter(':input[orig-val]').change(function...
        // since it is triggered programmatically
        if ($(el).val() === $(el).attr('orig-val')) {
          $(el).parent().attr('action', 'none');
          $(el).parent().removeClass('uncommitted');
        }
        else {
          if ($(el).parent().attr('new') === 'true') {
            $(el).parent().attr('action', 'create');
          }
          else {
            $(el).parent().attr('action', 'update');
          }
          $(el).parent().addClass('uncommitted');
        }
        checkIfAnyActionNeeded();
        return;
        //-----------------------------
      },
      onBeforeShow: function () {
        $(this).ColorPickerSetColor(this.value);
      }
    })
      .bind('keyup', function () {
        $(this).ColorPickerSetColor(this.value);
        $(this).css('background-color', '#' + this.value);
      });

    $('#form-labels').prepend(newElementEntry);
  }

  $('#add-new-label-entry').click(function () {
    createNewLabelEntry(null, 'new');
  });

  // Milestones

  function clearAllMilestones() {
    $('#form-milestones').text('');
    $('#commit-to-target-repo').text('Commit changes');
    $('#commit-to-target-repo').attr('disabled', 'disabled');
  }

  function createNewMilestoneEntry(milestone, mode) {

    let action = ' action="none" ';
    let uncommittedSignClass = '';

    if (mode === 'copy' || mode === 'new') {
      action = ' action="create" new="true" ';
      uncommittedSignClass = ' uncommitted ';
    }

    if (milestone === undefined || milestone === null) {
      milestone = {
        title: '',
        state: 'open',
        description: '',
        due_on: '',
        number: ''
      };
    }

    let origTitleVal = ' orig-val="' + milestone.title + '"';
    let state = milestone.state;
    let origDescriptionVal = ' orig-val="' + milestone.description + '"';
    let due_on = milestone.due_on;
    let number = milestone.number;

    let newElementEntry = $('\
      <div class="milestone-entry ' + uncommittedSignClass + '" ' + action + ' data-number="' + number + '" data-state="' + state + '" data-due_on="' + due_on + '">\
      <input name="title" type="text" class="form-control input-sm milestone-fitting" placeholder="Title" value="' + milestone.title + '" ' + origTitleVal + '>\
      <button type="button" class="btn btn-danger delete-button"><i class="fas fa-trash-alt"></i></button>\
      <button type="button" class="btn btn-success hidden recover-button"><i class="fas fa-history"></i></button>\
      <input name="description" type="text" class="form-control input-sm description-fitting" placeholder="Description" value="' + milestone.description + '" ' + origDescriptionVal + '>\
      </div>\
    ');

    newElementEntry.children(':input[orig-val]').change(function () {

      if ($(this).val() === $(this).attr('orig-val')) {//unchanged
        $(this).parent().attr('action', 'none');
        $(this).parent().removeClass('uncommitted');
      }
      else {//changed
        if ($(this).parent().attr('new') === 'true') {
          $(this).parent().attr('action', 'create');
        }
        else {
          $(this).parent().attr('action', 'update');
        }
        $(this).parent().addClass('uncommitted');
      }

      checkIfAnyActionNeeded();
      return;
    });

    //Delete button
    newElementEntry.children('.delete-button').click(function () {
      if ($(this).parent().attr('new') === 'true') {
        $(this).parent().remove();
      }
      else {
        $(this).siblings().addClass('deleted');
        $(this).siblings().attr('disabled', 'true');
        $(this).siblings('.recover-button').removeAttr('disabled');
        $(this).addClass('hidden');
        $(this).parent().attr('action', 'delete');
      }

      $(this).siblings('.recover-button').removeClass('hidden');

      checkIfAnyActionNeeded();
      return;
    });

    newElementEntry.children('.recover-button').click(function () {
      $(this).siblings().removeClass('deleted');
      $(this).siblings().removeAttr('disabled');
      $(this).siblings('.delete-button').removeClass('hidden');
      $(this).addClass('hidden');

      if ($(this).siblings('[name="title"]').attr('orig-val') === $(this).siblings('[name="title"]').val() &&
        $(this).siblings('[name="description"]').attr('orig-val') === $(this).siblings('[name="description"]').val()) {
        $(this).parent().attr('action', 'none');
      }
      else {
        $(this).parent().attr('action', 'update');
      }

      checkIfAnyActionNeeded();
    });

    $('#form-milestones').prepend(newElementEntry);
  }

  $('#add-new-milestone-entry').click(function () {
    createNewMilestoneEntry(null, 'new');
  });

  function clickToListAllEntries(kind) {
    let theButton = $(this);// dealing with closure
    targetOwner = $('#targetOwner').val();
    targetRepo = $('#targetRepo').val();

    if (targetOwner && targetRepo) {
      clearAllMilestones();

      apiCallGetEntries(targetOwner, targetRepo, kind, 'list', () => {
        theButton.button('reset');
      });
    }
    else {
      alert("Please enter the repo owner and the repo");
      theButton.button('reset');
    }
  }

  $('#list-all-labels').click(function () {
    clickToListAllEntries('labels');
  });


  $('#list-all-milestones').click(function () {
    clickToListAllEntries('milestones');
  });

  $('#revert-to-original').click(function () {
    let theButton = $(this);// dealing with closure
    clearAllLabels();
    clearAllMilestones();
    apiCallGetEntries(targetOwner, targetRepo, 'labels', 'list', () => {
      theButton.button('reset');
    });
    apiCallGetEntries(targetOwner, targetRepo, 'milestones', 'list', () => {
      theButton.button('reset');
    });
  });

  function clickToDeleteAllEntries(selector) {
    $(selector).children().each(function () {
      if ($(this).attr('new') === 'true') {
        $(this).remove();
      }
      else {
        $(this).children().addClass('deleted');
        $(this).children().attr('disabled', 'true');
        $(this).children(".recover-button").removeAttr('disabled');
        $(this).children('.delete-button').addClass('hidden');
        $(this).children('.recover-button').removeClass('hidden');
        $(this).attr('action', 'delete');
      }
    });
    checkIfAnyActionNeeded();
  }

  $('#delete-all-labels').click(function () {
    clickToDeleteAllEntries('#form-labels');
  })

  $('#delete-all-milestones').click(function () {
    clickToDeleteAllEntries('#form-milestones');
  })

  $('#copy-milestones-from').click(function () {
    let theButton = $(this);// dealing with closure
    let username = $('#copyFromOwner').val();
    let repo = $('#copyFromRepo').val();

    if (username && repo) {
      apiCallGetEntries(username, repo, 'milestones', 'copy', function () {
        theButton.button('reset');
      });//set adduncommitted to true because those are coming from another repo
    }
    else {
      alert("Please enter the repo owner and the repo");
      theButton.button('reset');
    }
  });

  $('#delete-and-copy-milestones-from').click(function () {
    let username = $('#copyFromOwner').val();
    let repo = $('#copyFromRepo').val();

    if (username && repo) {
      $("#form-milestones").children().each(function () {
        if ($(this).attr('new') === 'true') {
          $(this).remove();
        }
        else {
          $(this).children().addClass('deleted');
          $(this).children().attr('disabled', 'true');
          $(this).children(".recover-button").removeAttr('disabled');
          $(this).children('.delete-button').addClass('hidden');
          $(this).children('.recover-button').removeClass('hidden');
          $(this).attr('action', 'delete');
        }

      });

      apiCallGetEntries(username, repo, 'milestones', 'copy', function () {
        $(this).button('reset');
      });//set adduncommitted to true because those are coming from another repo
    }
    else {
      alert("Please follow the format: \n\nusername:repo");
      $(this).button('reset');
    }

    checkIfAnyActionNeeded();
  })

  $('#commit-to-target-repo').click(function () {
    let theButton = $(this);// dealing with closure
    let password = $('#personalAccessToken').val();

    if (password.trim() === '') {
      alert('You need to enter your personal access token for repo: ' + targetRepo + ' in order to commit changes.');
      theButton.button('reset');
      return;
    }

    commit();
  });

  // //Enable popovers
  // $('#targetRepo').popover({
  //   title: 'Example',
  //   content: '<code>github.com/Badwater-Apps/template-label-milestone-1</code> Then use <code>Badwater-Apps:template-label-milestone-1</code><br><em>Note that owner can also be an organization name.</em>',
  //   trigger: 'hover',
  //   html: true
  // });

  // $('#targetUsername').popover({
  //   title: "Why 'username' again?",
  //   content: "To let you modify a repo which belongs to another user or an organization. For example the repo maybe <code>my-organization:the-app</code> but username is <code>cylon</code>",
  //   trigger: "hover",
  //   html: true
  // });

  // $('#personalAccessToken').popover({
  //   title: "My token/password for what?",
  //   content: "Token/Password is only required for committing. It won't be required until you try to commit something. It is encouraged to use a token instead of your password.",
  //   trigger: "hover",
  //   html: true
  // });

  /**
  * Makes a label entry out of a div having the class .label-entry
  */
  function serializeEntries(jObjectEntry, kind) {
    if (kind === 'labels') {
      return {
        name: jObjectEntry.children('[name="name"]').val(),
        color: jObjectEntry.children('[name="color"]').val(),
        description: jObjectEntry.children('[name="description"]').val(),
        originalName: jObjectEntry.children('[name="name"]').attr('orig-val').val()
      };
    }
    else if (kind === 'milestones') {
      console.log('title: ' + jObjectEntry.children('[name="title"]').val());
      console.log('description: ' + jObjectEntry.children('[name="description"]').val());
      console.log('number: ' + jObjectEntry.attr('data-number'));
      console.log('state: ' + jObjectEntry.attr('data-state'));
      console.log('due_on: ' + jObjectEntry.attr('data-due_on'));
      return {
        title: jObjectEntry.children('[name="title"]').val(),
        state: jObjectEntry.attr('data-state'),
        description: jObjectEntry.children('[name="description"]').val(),
        due_on: jObjectEntry.attr('data-due_on'),
        number: jObjectEntry.attr('data-number')
      };
    }
    else {
      console.log('Bug in function serializeEntries!');
    }
  }

  /**
  * returns true if any change has been made and activates or disactivates commit button accordingly
  */
  function checkIfAnyActionNeeded() {
    let isNeeded = $('.label-entry:not([action="none"])').length > 0 | $('.milestone-entry:not([action="none"])').length > 0;

    if (isNeeded) {
      $('#commit-to-target-repo').removeAttr('disabled');
      $('#commit-to-target-repo').removeClass('disabled');
    }
    else {
      $('#commit-to-target-repo').attr('disabled', 'disabled');
    }

    return isNeeded;
  }

  function commit() {

    //freeze the world
    $('#loadingModal').modal({
      keyboard: false,
      backdrop: 'static'
    });
    isLoadingShown = true;

    //To be deleted
    $('.label-entry[action="delete"]').each(function () {
      let entryObject = serializeEntries($(this), 'labels');
      apiCallDeleteEntries(entryObject, 'labels');
    });

    $('.milestone-entry[action="delete"]').each(function () {
      let entryObject = serializeEntries($(this), 'milestones');
      apiCallDeleteEntries(entryObject, 'milestones');
    });

    //To be updated
    $('.label-entry[action="update"]').each(function () {
      let entryObject = serializeEntries($(this), 'labels');
      apiCallUpdateEntries(entryObject, 'labels');
    });

    $('.milestone-entry[action="update"]').each(function () {
      let entryObject = serializeEntries($(this), 'milestones');
      apiCallUpdateEntries(entryObject, 'milestones');
    });

    //To be created
    $('.label-entry[action="create"]').each(function () {
      let entryObject = serializeEntries($(this), 'labels');
      apiCallCreateEntries(entryObject, 'labels');
    });

    $('.milestone-entry[action="create"]').each(function () {
      let entryObject = serializeEntries($(this), 'milestones');
      apiCallCreateEntries(entryObject, 'milestones');
    });
  }

  function writeLog(string) {
    $('#loadingModal .modal-body').append(string + '<br>');
  }

  $('#loadingModal').on('hidden.bs.modal', function () {
    isLoadingShown = false;

    //reset modal
    $('#loadingModal .modal-body').text('');
    $('#loadingModal .modal-body').append('<p>Commiting...');
    $('#loadingModal .modal-footer').remove();

    //reload labels after changes
    clearAllLabels();
    apiCallGetEntries(targetOwner, targetRepo, 'labels', 'list');
  });

  /* ========== The rest is BASE64 STUFF ========== */
  let Base64 = {
    // http://stackoverflow.com/a/246813
    // private property
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode: function (input) {
      let output = "";
      let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      let i = 0;

      input = Base64._utf8_encode(input);

      while (i < input.length) {

        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }

        output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

      }

      return output;
    },

    // public method for decoding
    decode: function (input) {
      let output = "";
      let chr1, chr2, chr3;
      let enc1, enc2, enc3, enc4;
      let i = 0;

      input = input.replace(/[^A-Za-z0-9+/=]/g, "");

      while (i < input.length) {

        enc1 = this._keyStr.indexOf(input.charAt(i++));
        enc2 = this._keyStr.indexOf(input.charAt(i++));
        enc3 = this._keyStr.indexOf(input.charAt(i++));
        enc4 = this._keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
          output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
          output = output + String.fromCharCode(chr3);
        }

      }

      output = Base64._utf8_decode(output);

      return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode: function (string) {
      string = string.replace(/\r\n/g, "\n");
      let utftext = "";

      for (let n = 0; n < string.length; n++) {

        let c = string.charCodeAt(n);

        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        } else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }

      }

      return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode: function (utftext) {
      let string = "";
      let i = 0;
      let c = c1 = c2 = 0;

      while (i < utftext.length) {

        c = utftext.charCodeAt(i);

        if (c < 128) {
          string += String.fromCharCode(c);
          i++;
        } else if ((c > 191) && (c < 224)) {
          c2 = utftext.charCodeAt(i + 1);
          string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
          i += 2;
        } else {
          c2 = utftext.charCodeAt(i + 1);
          c3 = utftext.charCodeAt(i + 2);
          string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
          i += 3;
        }

      }

      return string;
    }

  };//end of Base64

}); //end of doc ready
