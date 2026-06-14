import React from "react";
import { Routes, Route } from "react-router-dom";
import EventList from "./EventList";
import EventForm from "./EventForm";
import EventDetail from "./EventDetail";

const Events = () => {
  return (
    <Routes>
      <Route path="/" element={<EventList />} />
      <Route path="new" element={<EventForm />} />
      <Route path="edit/:id" element={<EventForm />} />
      <Route path=":id" element={<EventDetail />} />
    </Routes>
  );
};

export default Events;
