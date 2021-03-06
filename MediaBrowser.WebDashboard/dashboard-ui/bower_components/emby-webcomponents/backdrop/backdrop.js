﻿define(['browser', 'connectionManager', 'playbackManager', 'css!./style'], function (browser, connectionManager, playbackManager) {

    function enableAnimation(elem) {

        if (browser.mobile) {
            return false;
        }

        return elem.animate;
    }

    function enableRotation() {

        if (browser.tv) {
            return false;
        }

        return true;
    }

    function backdrop() {

        var self = this;
        var isDestroyed;

        self.load = function (url, parent, existingBackdropImage) {

            var img = new Image();
            img.onload = function () {

                if (isDestroyed) {
                    return;
                }

                var backdropImage = document.createElement('div');
                backdropImage.classList.add('backdropImage');
                backdropImage.classList.add('displayingBackdropImage');
                backdropImage.style.backgroundImage = "url('" + url + "')";
                backdropImage.setAttribute('data-url', url);

                parent.appendChild(backdropImage);

                if (!enableAnimation(backdropImage)) {
                    if (existingBackdropImage && existingBackdropImage.parentNode) {
                        existingBackdropImage.parentNode.removeChild(existingBackdropImage);
                    }
                    internalBackdrop(true);
                    return;
                }

                var animation = fadeIn(backdropImage, 1);
                currentAnimation = animation;
                animation.onfinish = function () {

                    if (animation == currentAnimation) {
                        currentAnimation = null;
                    }
                    if (existingBackdropImage && existingBackdropImage.parentNode) {
                        existingBackdropImage.parentNode.removeChild(existingBackdropImage);
                    }
                };

                internalBackdrop(true);
            };
            img.src = url;
        };

        var currentAnimation;
        function fadeIn(elem, iterations) {
            var keyframes = [
              { opacity: '0', offset: 0 },
              { opacity: '1', offset: 1 }];
            var timing = { duration: 800, iterations: iterations, easing: 'ease-in' };
            return elem.animate(keyframes, timing);
        }

        function cancelAnimation() {
            var animation = currentAnimation;
            if (animation) {
                animation.cancel();
                currentAnimation = null;
            }
        }

        self.destroy = function () {

            isDestroyed = true;
            cancelAnimation();
        };
    }

    var backdropContainer;
    function getBackdropContainer() {

        if (!backdropContainer) {
            backdropContainer = document.querySelector('.backdropContainer');
        }

        if (!backdropContainer) {
            backdropContainer = document.createElement('div');
            backdropContainer.classList.add('backdropContainer');
            document.body.insertBefore(backdropContainer, document.body.firstChild);
        }

        return backdropContainer;
    }

    function clearBackdrop(clearAll) {

        clearRotation();

        if (currentLoadingBackdrop) {
            currentLoadingBackdrop.destroy();
            currentLoadingBackdrop = null;
        }

        var elem = getBackdropContainer();
        elem.innerHTML = '';

        if (clearAll) {
            hasExternalBackdrop = false;
        }
        internalBackdrop(false);
    }

    var backgroundContainer;
    function getBackgroundContainer() {
        if (!backgroundContainer) {
            backgroundContainer = document.querySelector('.backgroundContainer');
        }
        return backgroundContainer;
    }
    function setBackgroundContainerBackgroundEnabled() {

        if (hasInternalBackdrop || hasExternalBackdrop) {
            getBackgroundContainer().classList.add('withBackdrop');
        } else {
            getBackgroundContainer().classList.remove('withBackdrop');
        }
    }

    var hasInternalBackdrop;
    function internalBackdrop(enabled) {
        hasInternalBackdrop = enabled;
        setBackgroundContainerBackgroundEnabled();
    }

    var hasExternalBackdrop;
    function externalBackdrop(enabled) {
        hasExternalBackdrop = enabled;
        setBackgroundContainerBackgroundEnabled();
    }

    function getRandom(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    var currentLoadingBackdrop;
    function setBackdropImage(url) {

        if (currentLoadingBackdrop) {
            currentLoadingBackdrop.destroy();
            currentLoadingBackdrop = null;
        }

        var elem = getBackdropContainer();
        var existingBackdropImage = elem.querySelector('.displayingBackdropImage');

        if (existingBackdropImage && existingBackdropImage.getAttribute('data-url') == url) {
            if (existingBackdropImage.getAttribute('data-url') == url) {
                return;
            }
            existingBackdropImage.classList.remove('displayingBackdropImage');
        }

        var instance = new backdrop();
        instance.load(url, elem, existingBackdropImage);
        currentLoadingBackdrop = instance;
    }

    var windowWidth;
    function resetWindowSize() {
        windowWidth = screen.availWidth || window.innerWidth;
    }
    window.addEventListener("orientationchange", resetWindowSize);
    window.addEventListener('resize', resetWindowSize);
    resetWindowSize();

    function getItemImageUrls(item) {

        var apiClient = connectionManager.getApiClient(item.ServerId);

        if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {

            return item.BackdropImageTags.map(function (imgTag, index) {

                return apiClient.getScaledImageUrl(item.Id, {
                    type: "Backdrop",
                    tag: imgTag,
                    maxWidth: Math.min(windowWidth, 1920),
                    index: index
                });
            });
        }

        if (item.ParentBackdropItemId && item.ParentBackdropImageTags && item.ParentBackdropImageTags.length) {

            return item.ParentBackdropImageTags.map(function (imgTag, index) {

                return apiClient.getScaledImageUrl(item.ParentBackdropItemId, {
                    type: "Backdrop",
                    tag: imgTag,
                    maxWidth: Math.min(windowWidth, 1920),
                    index: index
                });
            });
        }

        return [];
    }

    function getImageUrls(items) {

        var list = [];

        for (var i = 0, length = items.length; i < length; i++) {

            var itemImages = getItemImageUrls(items[i]);

            itemImages.forEach(function (img) {
                list.push(img);
            });
        }

        return list;
    }

    function arraysEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length != b.length) return false;

        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.

        for (var i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    var rotationInterval;
    var currentRotatingImages = [];
    var currentRotationIndex = -1;
    function setBackdrops(items, imageSetId) {

        var images = getImageUrls(items);

        imageSetId = imageSetId || new Date().getTime();
        if (images.length) {

            startRotation(images, imageSetId);

        } else {
            clearBackdrop();
        }
    }

    function startRotation(images) {

        if (arraysEqual(images, currentRotatingImages)) {
            return;
        }

        clearRotation();

        currentRotatingImages = images;
        currentRotationIndex = -1;

        if (images.length > 1 && enableRotation()) {
            rotationInterval = setInterval(onRotationInterval, 20000);
        }
        onRotationInterval();
    }

    function onRotationInterval() {

        if (playbackManager.isPlayingVideo()) {
            return;
        }

        var newIndex = currentRotationIndex + 1;
        if (newIndex >= currentRotatingImages.length) {
            newIndex = 0;
        }

        currentRotationIndex = newIndex;
        setBackdropImage(currentRotatingImages[newIndex]);
    }

    function clearRotation() {
        var interval = rotationInterval;
        if (interval) {
            clearInterval(interval);
        }
        rotationInterval = null;
        currentRotatingImages = [];
        currentRotationIndex = -1;
    }

    function setBackdrop(url) {

        if (typeof url !== 'string') {
            url = getImageUrls([url])[0];
        }

        if (url) {
            clearRotation();

            setBackdropImage(url);

        } else {
            clearBackdrop();
        }
    }

    return {

        setBackdrops: setBackdrops,
        setBackdrop: setBackdrop,
        clear: clearBackdrop,
        externalBackdrop: externalBackdrop
    };

});