/**
 * Test manipulateEntries
 */

'use strict';

import { clearAllEntries } from '../js/manipulateEntries';

describe('Test manipulateEntires', () => {
  describe('Test clearAllEntries', () => {
    document.body.innerHTML = `
      <form id="form-labels">
        <div>Dummy to be removed.</div>
      </form>
      <button id="commit-to-target-repo" type="button" class="btn btn-raised btn-block btn-success" data-loading-text="Commiting...">
        To be changed
      </button>
    `;

    clearAllEntries('labels');

    const formEl = document.getElementById('form-labels');
    const commitToTargetRepo = document.getElementById('commit-to-target-repo');

    test('Test if the content of the corresponding form is cleared', () => {
      expect(formEl.textContent).toStrictEqual('');
    });
    test("Test if #commit-to-target-repo's text is changed correctly", () => {
      expect(commitToTargetRepo.textContent).toStrictEqual('Commit changes');
    });
    test("Test if #commit-to-target-repo's disabled attribute is added", () => {
      expect(commitToTargetRepo.getAttribute('disabled')).toStrictEqual('true');
    });
    test("Test if #commit-to-target-repo's btn-success class is removed", () => {
      expect(
        commitToTargetRepo.classList.contains('btn-success')
      ).toStrictEqual(false);
    });
    test("Test if #commit-to-target-repo's btn-outline-success class is added", () => {
      expect(
        commitToTargetRepo.classList.contains('btn-outline-success')
      ).toStrictEqual(true);
    });
  });

  // describe('Test clickToDeleteAllEntries', () => {
  //   document.body.innerHTML = `
  //     <form id="form-labels" class="form-inline">
  //       <div class="label-entry uncommitted" data-todo="create" new="true">
  //         <div class="card">
  //           <div class="card-body" id="label-grid"> <input name="name" type="text" class="form-control name-fitting"
  //               placeholder="Name" value="" data-orig-val="">
  //             <div class="empty-name-input invalid-input hidden"> Label name is required. </div>
  //             <div class="duplicate-name-input invalid-input hidden"> Another label with the same name exists. </div> <input
  //               name="color" type="text" class="form-control color-fitting color-box" placeholder="Color" value=""
  //               data-orig-val="" style="background-color: rgb(205, 16, 118);">
  //             <div class="invalid-color-input invalid-input hidden"> Invalid hex code. </div>
  //             <div class="empty-color-input invalid-input hidden"> Label color is required. </div> <input name="description"
  //               type="text" class="form-control description-fitting" placeholder="Description" value="" data-orig-val="">
  //           </div>
  //         </div> <button type="button" class="btn btn-danger delete-button"> <i class="fas fa-trash-alt" aria-hidden="true"></i>
  //         </button> <button type="button" class="btn btn-success hidden recover-button"> <i class="fas fa-history"
  //             aria-hidden="true"></i> </button>
  //         <div></div>
  //       </div>
  //       <div class="label-entry" data-todo="none">
  //         <div class="card">
  //           <div class="card-body" id="label-grid"> <input name="name" type="text" class="form-control name-fitting"
  //               placeholder="Name" value="type: question" data-orig-val="type: question">
  //             <div class="empty-name-input invalid-input hidden"> Label name is required. </div>
  //             <div class="duplicate-name-input invalid-input hidden"> Another label with the same name exists. </div> <input
  //               name="color" type="text" class="form-control color-fitting color-box" placeholder="Color" value="#CD1076"
  //               data-orig-val="#CD1076" style="background-color: rgb(205, 16, 118);">
  //             <div class="invalid-color-input invalid-input hidden"> Invalid hex code. </div>
  //             <div class="empty-color-input invalid-input hidden"> Label color is required. </div> <input name="description"
  //               type="text" class="form-control description-fitting" placeholder="Description"
  //               value="Further information is requested" data-orig-val="Further information is requested">
  //           </div>
  //         </div> <button type="button" class="btn btn-danger delete-button"> <i class="fas fa-trash-alt" aria-hidden="true"></i>
  //         </button> <button type="button" class="btn btn-success hidden recover-button"> <i class="fas fa-history"
  //             aria-hidden="true"></i> </button>
  //         <div></div>
  //       </div>
  //     </form>
  //   `

  //   clickToDeleteAllEntries('#form-labels');

  //   test('Test some case', () => {

  //   });
  // });
});