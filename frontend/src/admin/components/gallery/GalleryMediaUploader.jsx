import React, { useState, useRef } from 'react';
import { uploadService } from '../../../services/domainServices';
import { ImageUpload } from '../ImageUpload';
import toast from 'react-hot-toast';
import logger from '../../../utils/core/logger';

export function GalleryMediaUploader({
  image,
  video,
  onImageChange,
  onVideoChange,
  folder = 'gallery',
}) {
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoInputRef = useRef(null);
  const videoPlayerRef = useRef(null);

  const allowedVideoExts = ['.mp4', '.webm', '.mov', '.ogg', '.m4v'];
  const maxVideoSizeBytes = 100 * 1024 * 1024; // 100MB limit

  const handleVideoFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedVideoExts.includes(fileExt) && !file.type.startsWith('video/')) {
      toast.error(`Unsupported video format: ${file.name}. Allowed: MP4, WebM, MOV, OGG.`);
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    if (file.size > maxVideoSizeBytes) {
      toast.error(
        `Video is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max limit is 100MB.`,
      );
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(15);
    const toastId = toast.loading(
      `Uploading video reel (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`,
    );

    try {
      const progressTimer = setInterval(() => {
        setVideoUploadProgress((prev) => (prev < 88 ? prev + 10 : prev));
      }, 350);

      const formData = new FormData();
      formData.append('images', file);

      const res = await uploadService.uploadImages(formData, folder);
      clearInterval(progressTimer);
      setVideoUploadProgress(100);

      if (res?.images?.[0]) {
        onVideoChange(res.images[0]);
        toast.success('Showcase video reel uploaded successfully!', { id: toastId });
      } else {
        throw new Error('Upload succeeded but no video asset was returned.');
      }
    } catch (err) {
      logger.error('Video upload failed:', err);
      toast.error(
        err.response?.data?.message || err.message || 'Failed to upload video. Please try again.',
        { id: toastId },
      );
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleApplyDirectUrl = (e) => {
    e.preventDefault();
    if (!directVideoUrl.trim()) return;
    try {
      new URL(directVideoUrl.trim());
      onVideoChange(directVideoUrl.trim());
      setDirectVideoUrl('');
      setShowDirectUrlInput(false);
      toast.success('Video URL applied!');
    } catch (_err) {
      toast.error('Please enter a valid URL (e.g. https://.../video.mp4)');
    }
  };

  const togglePlayVideo = () => {
    if (!videoPlayerRef.current) return;
    if (videoPlayerRef.current.paused) {
      videoPlayerRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoPlayerRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.muted = !videoPlayerRef.current.muted;
    setIsMuted(videoPlayerRef.current.muted);
  };

  const handleRemoveVideo = () => {
    onVideoChange('');
    setIsVideoPlaying(false);
    toast.success('Video walkthrough removed');
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. COVER PHOTO ─── */}
      <div className="space-y-2 p-3.5 sm:p-4 rounded-[10px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
              photo_camera
            </span>
            <label className="text-[12px] font-bold text-[var(--admin-text-primary)]">
              Cover Photo <span className="text-rose-500">*</span>
            </label>
          </div>
          {image ? (
            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Ready
            </span>
          ) : (
            <span className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">
              Primary Card View
            </span>
          )}
        </div>

        <ImageUpload
          value={image}
          onChange={(val) => {
            onImageChange(val);
            toast.success('Cover photo selected!');
          }}
          folder={folder}
          label="Upload Cover Photo"
        />
      </div>

      {/* ─── 2. VIDEO REEL / WALKTHROUGH ─── */}
      <div className="space-y-3 p-3.5 sm:p-4 rounded-[10px] bg-[var(--admin-surface)] border border-[var(--admin-border)] shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)] shrink-0">
              videocam
            </span>
            <label className="text-[12px] font-bold text-[var(--admin-text-primary)] truncate">
              Video Walkthrough
            </label>
            <span className="text-[9px] font-semibold text-[var(--admin-text-tertiary)] bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--admin-border-subtle)] shrink-0 hidden sm:inline-block">
              Optional
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {video && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px]">check_circle</span>
                Ready
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowDirectUrlInput(!showDirectUrlInput)}
              className="text-[10.5px] font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[12px]">link</span>
              <span>{showDirectUrlInput ? 'Hide' : 'Paste URL'}</span>
            </button>
          </div>
        </div>

        {showDirectUrlInput && (
          <div className="p-2.5 rounded-[6px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center gap-2">
            <input
              type="url"
              value={directVideoUrl}
              onChange={(e) => setDirectVideoUrl(e.target.value)}
              placeholder="https://.../video.mp4"
              className="flex-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-2.5 py-1.5 text-[11.5px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)]"
            />
            <button
              type="button"
              onClick={handleApplyDirectUrl}
              className="px-3 py-1.5 rounded-[4px] bg-[var(--admin-accent)] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:brightness-105 shrink-0"
            >
              Apply
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={videoInputRef}
          type="file"
          className="hidden"
          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
          onChange={handleVideoFileSelect}
        />

        {/* Video Player or Sleek Dropzone */}
        {video ? (
          <div className="relative rounded-[8px] overflow-hidden border border-[var(--admin-border)] bg-stone-950 shadow-xs">
            <div className="relative aspect-video max-h-[220px] w-full bg-black flex items-center justify-center">
              <video
                ref={videoPlayerRef}
                src={video}
                className="w-full h-full object-contain"
                loop
                playsInline
                muted={isMuted}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              />

              {/* Player Overlay Controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-2.5">
                <div className="flex items-center justify-between text-white">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs border border-white/10 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-[var(--admin-accent)]">
                      play_circle
                    </span>
                    Showcase Walkthrough
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600/90 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Remove Video"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={togglePlayVideo}
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center cursor-pointer transition-transform active:scale-95 text-white"
                      title={isVideoPlaying ? 'Pause' : 'Play'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isVideoPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center cursor-pointer transition-transform active:scale-95 text-white"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isMuted ? 'volume_off' : 'volume_up'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-[4px] bg-white/20 hover:bg-white/30 text-[10px] font-bold uppercase tracking-wider text-white transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">sync</span>
                    Replace
                  </button>
                </div>
              </div>
            </div>

            {/* Video Footer URL */}
            <div className="px-3 py-1.5 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-xs text-stone-300">
              <span className="font-mono text-[10px] truncate max-w-[240px] text-stone-400">
                {video}
              </span>
              <a
                href={video}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[var(--admin-accent)] hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>View Full</span>
                <span className="material-symbols-outlined text-[11px]">open_in_new</span>
              </a>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !isUploadingVideo && videoInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[8px] p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
              isUploadingVideo
                ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5 cursor-wait'
                : 'border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-surface-muted)] bg-[var(--admin-bg-subtle)]'
            }`}
          >
            {isUploadingVideo ? (
              <div className="space-y-2.5 w-full max-w-xs mx-auto py-2">
                <div className="w-8 h-8 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center mx-auto animate-bounce">
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[var(--admin-text-primary)]">
                    Uploading video...
                  </p>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--admin-accent)] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--admin-accent)] font-bold block">
                  {videoUploadProgress}%
                </span>
              </div>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-accent)] shadow-2xs">
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[var(--admin-text-primary)]">
                    Upload Video (up to 100MB)
                  </p>
                  <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5">
                    Click to browse or drag and drop MP4, WebM
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
