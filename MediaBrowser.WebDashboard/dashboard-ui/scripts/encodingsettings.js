﻿define(['jQuery'], function ($) {

    function loadPage(page, config, systemInfo) {

        page.querySelector('#chkEnableThrottle').checked = config.EnableThrottling;

        $('#selectVideoDecoder', page).val(config.HardwareAccelerationType);
        $('#selectThreadCount', page).val(config.EncodingThreadCount);
        $('#txtDownMixAudioBoost', page).val(config.DownMixAudioBoost);
        page.querySelector('.txtEncoderPath').value = config.EncoderAppPath || '';
        $('#txtTranscodingTempPath', page).val(config.TranscodingTempPath || '');

        var selectEncoderPath = page.querySelector('#selectEncoderPath');

        selectEncoderPath.value = systemInfo.EncoderLocationType;
        onSelectEncoderPathChange.call(selectEncoderPath);

        Dashboard.hideLoadingMsg();
    }

    function onSaveEncodingPathFailure(response) {

        Dashboard.hideLoadingMsg();

        var msg = '';

        // This is a fallback that handles both 404 and 400 (no path entered)
        msg = Globalize.translate('FFmpegSavePathNotFound');

        require(['alert'], function (alert) {
            alert(msg);
        });
    }

    function updateEncoder(form) {

        return ApiClient.getSystemInfo().then(function(systemInfo) {
            
            if (systemInfo.EncoderLocationType == "External") {
                return;
            }

            return ApiClient.ajax({
                url: ApiClient.getUrl('System/MediaEncoder/Path'),
                type: 'POST',
                data: {
                    Path: form.querySelector('.txtEncoderPath').value,
                    PathType: form.querySelector('#selectEncoderPath').value
                }
            }).then(Dashboard.processServerConfigurationUpdateResult, onSaveEncodingPathFailure);
        });
    }

    function onSubmit() {

        var form = this;

        var onDecoderConfirmed = function () {
            Dashboard.showLoadingMsg();

            ApiClient.getNamedConfiguration("encoding").then(function (config) {

                config.DownMixAudioBoost = $('#txtDownMixAudioBoost', form).val();
                config.TranscodingTempPath = $('#txtTranscodingTempPath', form).val();
                config.EncodingThreadCount = $('#selectThreadCount', form).val();
                config.HardwareAccelerationType = $('#selectVideoDecoder', form).val();

                config.EnableThrottling = form.querySelector('#chkEnableThrottle').checked;

                ApiClient.updateNamedConfiguration("encoding", config).then(function () {

                    updateEncoder(form);
                });
            });
        };

        if ($('#selectVideoDecoder', form).val()) {

            require(['alert'], function (alert) {
                alert({
                    title: Globalize.translate('TitleHardwareAcceleration'),
                    text: Globalize.translate('HardwareAccelerationWarning')
                }).then(onDecoderConfirmed);
            });

        } else {
            onDecoderConfirmed();
        }


        // Disable default form submission
        return false;
    }

    function getTabs() {
        return [
        {
            href: 'cinemamodeconfiguration.html',
            name: Globalize.translate('TabCinemaMode')
        },
         {
             href: 'playbackconfiguration.html',
             name: Globalize.translate('TabResumeSettings')
         },
         {
             href: 'streamingsettings.html',
             name: Globalize.translate('TabStreaming')
         },
         {
             href: 'encodingsettings.html',
             name: Globalize.translate('TabTranscoding')
         }];
    }

    function onSelectEncoderPathChange(e) {

        var page = $(this).parents('.page')[0];

        if (this.value == 'Custom') {
            page.querySelector('.fldEncoderPath').classList.remove('hide');
        } else {
            page.querySelector('.fldEncoderPath').classList.add('hide');
        }
    }

    $(document).on('pageinit', "#encodingSettingsPage", function () {

        var page = this;

        $('#btnSelectEncoderPath', page).on("click.selectDirectory", function () {

            require(['directorybrowser'], function (directoryBrowser) {

                var picker = new directoryBrowser();

                picker.show({

                    includeFiles: true,
                    callback: function (path) {

                        if (path) {
                            $('.txtEncoderPath', page).val(path);
                        }
                        picker.close();
                    }
                });
            });
        });

        $('#btnSelectTranscodingTempPath', page).on("click.selectDirectory", function () {

            require(['directorybrowser'], function (directoryBrowser) {

                var picker = new directoryBrowser();

                picker.show({

                    callback: function (path) {

                        if (path) {
                            $('#txtTranscodingTempPath', page).val(path);
                        }
                        picker.close();
                    },

                    header: Globalize.translate('HeaderSelectTranscodingPath'),

                    instruction: Globalize.translate('HeaderSelectTranscodingPathHelp')
                });
            });
        });

        $('.encodingSettingsForm').off('submit', onSubmit).on('submit', onSubmit);

        page.querySelector('#selectEncoderPath').addEventListener('change', onSelectEncoderPathChange);

    }).on('pageshow', "#encodingSettingsPage", function () {

        Dashboard.showLoadingMsg();

        LibraryMenu.setTabs('playback', 3, getTabs);
        var page = this;

        ApiClient.getNamedConfiguration("encoding").then(function (config) {

            ApiClient.getSystemInfo().then(function (systemInfo) {

                if (systemInfo.EncoderLocationType == "External") {
                    page.querySelector('.fldSelectEncoderPathType').classList.add('hide');
                } else {
                    page.querySelector('.fldSelectEncoderPathType').classList.remove('hide');
                }
                loadPage(page, config, systemInfo);
            });
        });

    });

});
