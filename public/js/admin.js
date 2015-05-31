$(document).ready(function() {

    // Admin tools
    // All functions here use server-side auth
    $('.delItem').click(function() {
        var id = $(this).attr('data-item');
        id = id.replace(/"/g, '');
        console.log('Delete '+id);

        var ajax = new XMLHttpRequest();
        ajax.open('GET', '/api/deleteitem/' + id, true);
        ajax.send();
        var elem = $(this);

        ajax.onreadystatechange=function() {
            if (ajax.readyState === 4) {
                console.log(ajax.responseText);
                if (ajax.responseText === 'Success') {
                    elem.parent().parent().parent().parent().remove();
                }
                else {
                    elem.parent().parent().parent().html(ajax.responseText);
                }
            }
        };
    });
    $('.featureItem').click(function() {
        var id = $(this).attr('data-item');
        id = id.replace(/"/g, '');
        console.log('Feature '+id);

        var ajax = new XMLHttpRequest();
        ajax.open('GET', '/api/featureitem/' + id, true);
        ajax.send();
        var elem = $(this);

        ajax.onreadystatechange=function() {
            if (ajax.readyState === 4) {
                console.log(ajax.responseText);
                if (ajax.responseText === 'Success') {
                    elem.html('Featured!');
                }
                else {
                    elem.parent().parent().parent().html(ajax.responseText);
                }
            }
        };
    });

});
