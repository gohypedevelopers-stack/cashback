"use client";

import React from "react";
import Store from "./Store";
import { useSEO } from "../hooks/useSEO";

const GiftCards = () => {
  useSEO(
    "Buy Gift Cards & Earn Loyalty Points | Assured Rewards",
    "Shop top brand gift cards and earn loyalty points on every purchase. Enjoy exclusive member benefits and get the best cashback offers instantly with us."
  );
  return <Store />;
};

export default GiftCards;
