// Crop step shown right after picking a photo — locks to the same aspect
// ratio the customer-facing site displays dish photos at (4:3, see
// apps/customer/src/styles.css), so what an admin frames here is exactly
// what a diner sees, with no surprise cropping happening later.

import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";

export function cropImage(file, { aspectRatio = 4 / 3 } = {}) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);

    const overlay = document.createElement("div");
    overlay.className = "prompt-modal-overlay crop-modal-overlay";
    overlay.innerHTML = `
      <div class="crop-modal">
        <h3>Frame the photo</h3>
        <div class="crop-modal-canvas">
          <img id="crop-modal-image" src="${objectUrl}" alt="" />
        </div>
        <div class="prompt-modal-actions">
          <button type="button" class="secondary-button" id="crop-modal-cancel">Cancel</button>
          <button type="button" class="primary-button" id="crop-modal-confirm">Use Photo</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const imageEl = overlay.querySelector("#crop-modal-image");
    const cropper = new Cropper(imageEl, {
      aspectRatio,
      viewMode: 1,
      autoCropArea: 1,
      background: false,
      guides: false,
    });

    function close(result) {
      cropper.destroy();
      URL.revokeObjectURL(objectUrl);
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector("#crop-modal-cancel").addEventListener("click", () => close(null));
    overlay.querySelector("#crop-modal-confirm").addEventListener("click", () => {
      const canvas = cropper.getCroppedCanvas({ maxWidth: 1600, maxHeight: 1600 });
      canvas.toBlob(
        (blob) => close(blob ? new File([blob], file.name, { type: "image/jpeg" }) : null),
        "image/jpeg",
        0.9
      );
    });
  });
}
