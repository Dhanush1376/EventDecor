const fs = require('fs');
const file = 'c:/Users/Dhanush/OneDrive/Desktop/PROJECTS/EventDecor/frontend/src/admin/pages/AdminAddProduct.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the marker: "{isEditMode ? 'Update Curation' : 'Publish to Shop'}"
// Then we just want the rest of the button, div closures, LivePreviewCard, AiCurationOverlay, DraftRestoreModal, etc.

const goodEnding = `                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <LivePreviewCard formData={formData} mobileTab={mobileTab} />

      <AiCurationOverlay showAIHUD={showAIHUD} setShowAIHUD={setShowAIHUD} aiAnalysisResult={aiAnalysisResult} aiChatInput={aiChatInput} setAiChatInput={setAiChatInput} handleAiChatSubmit={handleAiChatSubmit} isAILearning={isAILearning} handleApplyAISpecs={handleApplyAISpecs} />
      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Products"
        lastSavedAt={lastSavedAt}
      />

      <DraftConflictViewer
        isOpen={showConflictModal}
        serverData={serverData}
        draftData={formData}
        onKeepServer={() => {
          setFormData(serverData);
          setShowConflictModal(false);
        }}
        onKeepDraft={() => setShowConflictModal(false)}
        moduleName="Product"
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );

  return mainLayout;
}
`;

// Splicing
let marker = "{isEditMode ? 'Update Curation' : 'Publish to Shop'}";
let index = content.indexOf(marker);
if (index !== -1) {
    let sliced = content.substring(0, index + marker.length) + '\n' + goodEnding;
    fs.writeFileSync(file, sliced);
    console.log("Fixed AdminAddProduct.jsx!");
} else {
    console.log("Marker not found.");
}
