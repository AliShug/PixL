$(document).ready(function() {
    
    // Watch file input and check file extension
    // (Obviously isn't bulletproof, but stops dumb uploads)
    $('#fileInput').change(function() {
        if ($(this).val().toLowerCase().indexOf('.fbx') === -1) {
            alert('Invalid file extension');
            $(this).val('');
        }
    });

    // Watch the tag input and show how many have registered
    $('#tagInput').on('input propertychange paste', function() {
        var raw = $(this).val();
        var tags = raw.split(',');

        var finalTags = [];
        for (var i = 0; i < tags.length; i++) {
            if (tags[i] !== '') {
                finalTags.push(tags[i]);
            }
        }
        
        $('#tagCount').html(finalTags.length + '/20');

        if (finalTags.length > 20) {
            $('#submitBtn').attr('disabled',true);
        }
        else {
            $('#submitBtn').removeAttr('disabled');
        }
    });


});
