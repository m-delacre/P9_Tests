/**
 * @jest-environment jsdom
 */

 import { fireEvent, screen, waitFor } from "@testing-library/dom";
 import NewBillUI from "../views/NewBillUI.js";
 import NewBill from "../containers/NewBill.js";
 import { ROUTES, ROUTES_PATH } from "../constants/routes";
 import { localStorageMock } from "../__mocks__/localStorage.js";
 import mockStore from "../__mocks__/store";
 import Router from "../app/Router";
 import userEvent from "@testing-library/user-event";
 
 jest.mock("../app/store", () => mockStore);
 
describe("Given I am connected as an employee", () => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
    })
  );
  document.body.innerHTML = `<div id="root"></div>`;
  Router();

  describe("when I submit the form with empty fields", () => {
    test("then I should stay on new Bill page", () => {
      window.onNavigate(ROUTES_PATH.NewBill);
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      //verif que les champs sont vides
      expect(screen.getByTestId("expense-name").value).toBe("");
      expect(screen.getByTestId("datepicker").value).toBe("");
      expect(screen.getByTestId("amount").value).toBe("");
      expect(screen.getByTestId("vat").value).toBe("");
      expect(screen.getByTestId("pct").value).toBe("");
      expect(screen.getByTestId("file").value).toBe("");

      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));

      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
      expect(form).toBeTruthy();
    });
  });

  describe("when I upload a file with the wrong format", () => {
    test("then it should return an error message", async () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const inputFile = screen.getByTestId("file");
      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);

      fireEvent.change(inputFile, {
        target: {
          files: [
            new File(["document.txt"], "document.txt", {
              type: "document/txt",
            }),
          ],
        },
      });
      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0].type).toBe("document/txt");
      await waitFor(() => screen.getByTestId("message-error"));
      expect(screen.getByTestId("message-error").classList).not.toContain("hidden");
      await waitFor(() =>screen.getByText("Ce format de fichier n'est pas accepté"));
      expect(screen.getByText("Ce format de fichier n'est pas accepté")).toBeTruthy();
    });
  });

  describe("when I upload a file with the good format", () => {
    test("then input file should show the file name", async () => {
      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const file = new File(["img"], "image.png", { type: "image/png" });
      const inputFile = screen.getByTestId("file");
      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
      inputFile.addEventListener("change", handleChangeFile);
      userEvent.upload(inputFile, file);

      expect(handleChangeFile).toHaveBeenCalled();
      expect(inputFile.files[0]).toStrictEqual(file);
      expect(inputFile.files[0].name).toBe("image.png");
      await waitFor(() => screen.getByTestId("message-error"));
      expect(screen.getByTestId("message-error").classList).toContain("hidden");
    });
  });

});

//test d'intégration
describe("Given I am connected as Employee on NewBill page, and submit the form", () => {
  beforeEach(() => {
    jest.spyOn(mockStore, "bills");

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "a@a",
      })
    );
    document.body.innerHTML = `<div id="root"></div>`;
    Router();
  });

  describe("When I do fill fields in correct format and I click on submit button", () => {
    describe("When fetches update bill API PUT", () => {
      test("Then, I should be sent to Bills page", async () => {
        const updateBill = mockStore.bills().update();
        const addedBill = await updateBill.then((value) => {
          return value;
        });

        expect(addedBill.id).toEqual("47qAXb6fIm2zOKkLzMro");
        expect(addedBill.amount).toEqual(400);
        expect(screen.getAllByText("Mes notes de frais"));
      });
    });

    describe("When fetches error from an API", () => {
      test("Then, it should display a message error", async () => {
        console.error = jest.fn();
        window.onNavigate(ROUTES_PATH.NewBill);
        mockStore.bills.mockImplementationOnce(() => {
          return {
            update: () => {
              return Promise.reject(new Error("Erreur"));
            },
          };
        });

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const form = screen.getByTestId("form-new-bill");
        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
        form.addEventListener("submit", handleSubmit);
        fireEvent.submit(form);
        expect(handleSubmit).toHaveBeenCalled();

        await new Promise(process.nextTick);
        expect(console.error).toHaveBeenCalled();
      });
    });
  });
});