import React, { useEffect, useRef, useState } from "react";

const AutoPlayIframe = ({ videoId, ...props }) => {
  const containerRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [timestamp, setTimestamp] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load YouTube API script once
  useEffect(() => {
    if (!window.YTApiLoaded) {
      window.YTApiLoaded = true;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => {
        window.YTReady = true;
      };
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize the player once the API is ready
  useEffect(() => {
    if (!isInitialized && window.YTReady && window.YT && window.YT.Player) {
      initializePlayer();
    } else if (!isInitialized) {
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT);
          initializePlayer();
        }
      }, 100);
      return () => clearInterval(checkYT);
    }
  }, [isInitialized]);

  const initializePlayer = () => {
    if (isInitialized) return;
    setIsInitialized(true);

    const newPlayer = new window.YT.Player("youtube-player-container", {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        mute: 0, // Allow audio
        controls: 1,
        playsinline: 1,
        rel: 0,
        start: Math.floor(timestamp),
      },
      events: {
        onReady: (event) => {
          setPlayer(event.target);
          try {
            event.target.playVideo();
          } catch (e) {
            console.error("Error playing video:", e);
          }
        },
        onStateChange: (event) => {
          // You can handle state changes if needed
        },
        onError: (event) => {
          console.error("YouTube player error:", event.data);
        },
      },
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: "56.25%", // 16:9 ratio
        backgroundColor: "#000",
      }}
      {...props}
    >
      <div
        id="youtube-player-container"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default AutoPlayIframe;
