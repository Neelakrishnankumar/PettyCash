import { createSlice } from "@reduxjs/toolkit";
let urlPath = 'https://cafemgr.benmoredata.com/api/';

const initialState =
{
  Authorization: "eyJhbGciOiJIUzI1NiIsInR5cGUiOiJKV1QifQ.eyJzdWIiOiJCZXhAMTIzIiwibmFtZSI6IkJleCIsImFkbWluIjp0cnVlLCJleHAiOjE2Njk5ODQzNDl9.uxE3r3X4lqV_WKrRKRPXd-Jub9BnVcCXqCtLL4I0fpU",
  ImageUrl: "https://cafemgr.benmoredata.com/uploads/images/",
  loginUrl: urlPath + 'LController.php?data=',
  Dropdown: urlPath + 'APIController.php',
  LocationGet: urlPath + 'wslistview_mysql.php?data=',
  OrderGet: urlPath + 'OrdersGet.php',
  OrderPost: urlPath + 'OrdersPost.php',

};

export const getUrlSlice = createSlice({
  name: "globalurl",
  initialState,
  reducers: {},
});

export default getUrlSlice.reducer;
