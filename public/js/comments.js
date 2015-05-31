$(document).ready(function() {

    $('#commentBtn').click(function() {
        var id = $(this).attr('data-item');
        id = id.replace(/"/g, '');

        var ajax = new XMLHttpRequest();
        ajax.open(  'GET', '/api/postcomment/' + id +
                    '?msg=' + $('#commentInput').val() +
                    '&author=' + username, true);
        ajax.send();
        var elem = $(this);

        ajax.onreadystatechange=function() {
            if (ajax.readyState === 4) {
                console.log(ajax.responseText);
                $('#commentBox').remove();
                $('#commentsContainer').prepend( $(ajax.responseText) );
            }
        };
    });

});
