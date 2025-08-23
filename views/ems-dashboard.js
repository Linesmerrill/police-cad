// Toast notification functions
function showToast(message, type = 'success') {
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex align-items-center">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close-toast" onclick="removeToast('${toastId}')" aria-label="Close">
          <i class="fa fa-times"></i>
        </button>
      </div>
    </div>
  `;
  
  $('#toast-container').append(toastHtml);
  
  // Show the toast with CSS animation
  $(`#${toastId}`).fadeIn(300);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    removeToast(toastId);
  }, 5000);
}
