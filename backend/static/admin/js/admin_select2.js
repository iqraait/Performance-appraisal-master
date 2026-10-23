/* ==========================================================================
   IQRAA Hospital Admin - Select2 Multi-Select Enhancements
   Provides modern tag/pill multi-selection with search, "Select All", 
   "Clear All", and dynamic counter for Departments, Locations, & Branches.
   ========================================================================== */

(function() {
    'use strict';

    function initSelect2Widgets() {
        var $ = null;
        if (window.django && window.django.jQuery && window.django.jQuery.fn.select2) {
            $ = window.django.jQuery;
        } else if (window.jQuery && window.jQuery.fn.select2) {
            $ = window.jQuery;
            if (window.django && window.django.jQuery) {
                window.django.jQuery.fn.select2 = window.jQuery.fn.select2;
            }
        } else if (window.django && window.django.jQuery) {
            $ = window.django.jQuery;
        } else if (window.jQuery) {
            $ = window.jQuery;
        }

        if (!$ || !$.fn.select2) {
            setTimeout(initSelect2Widgets, 100);
            return;
        }

        var multiFields = [
            {
                selector: '#id_departments',
                placeholder: '🔍 Click or type to search departments...',
                label: 'Departments'
            },
            {
                selector: '#id_locations',
                placeholder: '🔍 Click or type to search locations (optional)...',
                label: 'Locations'
            },
            {
                selector: '#id_branches',
                placeholder: '🔍 Click or type to search branches (optional)...',
                label: 'Branches'
            }
        ];

        multiFields.forEach(function(item) {
            var $field = $(item.selector);
            if ($field.length === 0) return;

            // Avoid duplicate initialization
            if ($field.data('select2-enhanced')) return;
            $field.data('select2-enhanced', true);

            // Create a clean toolbar above the select element
            var $wrapper = $('<div class="multi-select-toolbar-wrapper"></div>');
            var $toolbar = $('<div class="multi-select-actions-bar"></div>');
            var $countBadge = $('<span class="multi-select-count-badge">0 selected</span>');
            var $selectAllBtn = $('<button type="button" class="btn-micro-action btn-select-all">✓ Select All</button>');
            var $clearAllBtn = $('<button type="button" class="btn-micro-action btn-clear-all">✕ Clear All</button>');

            $toolbar.append($countBadge);
            $toolbar.append($selectAllBtn);
            $toolbar.append($clearAllBtn);

            // Wrap and inject toolbar
            $field.before($wrapper);
            $wrapper.append($toolbar);
            $wrapper.append($field);

            // Initialize Select2 with rich tags
            $field.select2({
                placeholder: item.placeholder,
                allowClear: true,
                width: '100%',
                closeOnSelect: false, // Keep open for multi-picking convenience
                dropdownAutoWidth: true
            });

            // Function to update counter badge
            function updateCount() {
                var values = $field.val();
                var count = values ? values.length : 0;
                var total = $field.find('option').length;
                if (count === 0) {
                    $countBadge.text('0 / ' + total + ' selected').removeClass('active');
                } else if (count === total) {
                    $countBadge.text('All ' + total + ' selected ★').addClass('active');
                } else {
                    $countBadge.text(count + ' of ' + total + ' selected').addClass('active');
                }
            }

            // Bind toolbar actions
            $selectAllBtn.on('click', function(e) {
                e.preventDefault();
                $field.find('option').prop('selected', true);
                $field.trigger('change');
            });

            $clearAllBtn.on('click', function(e) {
                e.preventDefault();
                $field.find('option').prop('selected', false);
                $field.trigger('change');
            });

            // Update badge on changes
            $field.on('change', updateCount);

            // Initial count
            updateCount();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSelect2Widgets);
    } else {
        initSelect2Widgets();
    }
})();
