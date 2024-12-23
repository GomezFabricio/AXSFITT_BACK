import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'Gmail', 
  auth: {
    user: 'cp15414621@gmail.com', 
    pass: 'ykka uxev nebc hcss', 
  },
});

export default transporter;