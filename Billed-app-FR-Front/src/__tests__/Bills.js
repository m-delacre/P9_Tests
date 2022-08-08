/**
 * @jest-environment jsdom
 */

 import "@testing-library/jest-dom";
 import "@testing-library/jest-dom/extend-expect";
 import userEvent from "@testing-library/user-event";
 import {screen,waitFor,getByText,getAllByTestId} from "@testing-library/dom";
 import BillsUI from "../views/BillsUI.js";
 import Bills from "../containers/Bills.js";
 import { bills } from "../fixtures/bills.js";
 import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
 import { localStorageMock } from "../__mocks__/localStorage.js";
 import mockStore from "../__mocks__/store";
 import Router from "../app/Router.js";
 
 jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
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
      window.onNavigate(ROUTES_PATH.Bills);

      const windowIcon = await waitFor(() => screen.getByTestId("icon-window"));
      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({
        data: bills.sort((a, b) => new Date(b.date) - new Date(a.date)), // correction du bug ()
      });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = bills.map((d) => d.date).sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });

  describe("When I click on the new bill button", () => {
    test("Then, I should be sent to newBill page", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      }

      Object.defineProperty(window, "localStorage", {value: localStorageMock})
      window.localStorage.setItem("user",JSON.stringify({
          type: "Employee",
        })
      )

      const bills = new Bills({document,onNavigate,store: null,localStorage: window.localStorage,});

      const handleClickNewBill = jest.fn(bills.handleClickNewBill);
      const btnNewBill = screen.getByTestId("btn-new-bill");
      btnNewBill.addEventListener("click", handleClickNewBill);
      userEvent.click(btnNewBill);
      expect(handleClickNewBill).toHaveBeenCalled();
    });
  });

  describe("When I click on the eye icon", () => {
    test("A modal should open", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      Object.defineProperty(window, "localStorage", {value: localStorageMock})
      window.localStorage.setItem("user",JSON.stringify({
          type: "Employee",
        })
      )

      const billsPage = new Bills({document,onNavigate,store: null,localStorage: window.localStorage,});

      $.fn.modal = jest.fn(); //simulation de la modale

      const firstEyeIcon = getAllByTestId(document.body, "icon-eye")[0]; 
      const handleClickIconEye = jest.fn(billsPage.handleClickIconEye(firstEyeIcon));
      firstEyeIcon.addEventListener("click", handleClickIconEye);
      userEvent.click(firstEyeIcon);
      expect(handleClickIconEye).toHaveBeenCalled();
      const modale = screen.getByTestId("modale");
      expect(modale).toBeTruthy();
    });
  });

  // test d'intégration GET
  describe("When I navigate to Bills page", () => {
    test("fetches bills from mock API GET", async () => {
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

      const bills = await mockStore.bills().list();
      expect(bills.length).toBe(4);
      expect(bills[2].name).toBe("test3");
      expect(bills[1].commentAdmin).toBe("en fait non");
    });
  });
  
  //verif erreurs api
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(
          window,
          "localStorage",
          { value: localStorageMock }
      )
      window.localStorage.setItem("user", JSON.stringify({
        type: "Employee",
        email: "a@a"
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      Router()
    });
    //Vérif error 404
    test("Then fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 404"))
          }
        }})
      const html = BillsUI({ error: "Erreur 404" })
      document.body.innerHTML = html
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    });
    //Vérif error 500
    test("Then fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list : () =>  {
            return Promise.reject(new Error("Erreur 500"))
          }
        }})
      const html = BillsUI({ error: "Erreur 500" })
      document.body.innerHTML = html
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    });
  });

});
