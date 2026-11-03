# Camera and tracker setup

The website embeds a YouTube Live video ID. The tracker reads frames separately from the local camera, OBS Virtual Camera or RTSP source. It does not attempt to capture frames from the YouTube iframe.

## Calibrate locally

```powershell
python -m pip install -r tracker/requirements.txt
python tracker/track_fish.py --source 0 --preview --dry-run
```

The preview draws the exact six selection zones and BUY/SELL strip used by the server. Press `Q` to exit. If the camera is occupied by OBS, select OBS Virtual Camera or an RTSP feed instead of the same physical device index.

Crop out room edges, filters and tank decorations with `--roi x,y,width,height`, for example `--roi 0.08,0.11,0.83,0.78`. These are fractions of the **full camera frame**. The server sees coordinates normalized to this crop.

The initial tracker looks for orange pixels in HSV space, then chooses a plausible contour using size and proximity to the previous detection. Start with the default `--hsv-lower 0,80,55 --hsv-upper 25,255,255`; tune them for Vlad's color and tank lighting. `--min-area` and `--max-area` reject tiny reflections and large background patches. The baseline may confuse orange ornaments, reflections or another fish. Verify detection against Vlad's actual video before enabling ingest. If Vlad is not orange, replace the segmentation method with a trained detector while keeping the same JSON observation contract.

To send observations after calibration:

```powershell
$env:INGEST_TOKEN = "the-same-secret-as-the-server"
python tracker/track_fish.py --source 0 --preview
```

By default, the bridge posts up to five observations per second to `http://127.0.0.1:8787`. Set `VLAD_API_URL` if the API is on another host. Use HTTPS for a remote endpoint. The server computes dwell from receipt times, so a video file replay should only be used as a labelled test, never presented as a live fish session.

## Production camera checklist

- Keep the tank view fixed and the crop stable; changes invalidate zone geometry.
- Watch the preview through multiple lighting conditions and feeding times.
- Confirm the tracker reports low confidence when Vlad leaves the frame.
- Keep the paper ledger in a fresh `APP_MODE=live` database when going live.
- Compare a real five-second selection and action to the signal log before public launch.

The tracker sends coordinates and confidence only. It does not upload frames to the API or store a video recording.
