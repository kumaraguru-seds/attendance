/**
 * ==========================================
 * SEDS MASTER MAILER SYSTEM (mailer.gs)
 * Updated: Cancellation includes "Cancelled By"
 * Added: Calendar Invite (.ICS)
 * ==========================================
 */

var SPREADSHEET_ID = "1HmYAPLdIJvqI-10hMjwTZAHyl7Rtmg1YshL0FZAo2CQ"; 
var ADMIN_EMAILS = ["manilunar07@gmail.com"];
var LOGO_URL = "https://drive.google.com/uc?export=view&id=10UKXL9GdS41qubzq8RELeCKvHFJk_17B";
var SENDER_NAME = "SEDS Meet Reminder"; 

var WORKER_1_URL = "https://script.google.com/macros/s/AKfycbzF_O8w8GFE7Mj9keCEYC1e4_p74g66TGQaueHU048alTDWb0rCn9NimDa2uKGPdJbUfQ/exec";
var WORKER_2_URL = "https://script.google.com/macros/s/AKfycbyghx9APhxtOrUFBkf0GNvnPVUdVZTtDq-PcY6cO2xbQoFEgAGvbfy_X9zx6vYwy03IMA/exec"; 


function runManualCheck() {

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Team Meet Schedule");
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(1, 1, lastRow, 13).getValues();
  const membersSheet = ss.getSheetByName("Members Details");
  const membersData = membersSheet.getDataRange().getValues();

  let totalSent = 0;
  let inviteTableRows = "";
  let cancelTableRows = "";

  for (let i = 1; i < data.length; i++) {

    const row = i + 1;
    const rowData = data[i];
    const teamName = rowData[1];
    const status = rowData[9] ? String(rowData[9]).toLowerCase() : "";
    const cancelSent = rowData[11];
    const inviteSent = rowData[12];

    if (!teamName || !rowData[3]) continue;

    if (status === "cancelled" && cancelSent !== "Sent") {

      const res = sendSEDSMail(teamName, membersData, "CANCELLED", rowData);

      if (res.count > 0) {

        sheet.getRange(row, 12).setValue("Sent");
        sheet.getRange(row, 13).setValue("-");
        cancelTableRows += res.rows;
        totalSent += res.count;

      }

    } 
    else if (inviteSent === "" && (status === "active" || status === "scheduled" || status === "")) {

      const res = sendSEDSMail(teamName, membersData, "SCHEDULED", rowData);

      if (res.count > 0) {

        sheet.getRange(row, 13).setValue("Sent");
        inviteTableRows += res.rows;
        totalSent += res.count;

      }

    }

  }

  if (totalSent > 0) {

    sendMasterAdminReport(totalSent, inviteTableRows, cancelTableRows);

  }

}


/**
 * Constructs individual emails to members
 */

function sendSEDSMail(teamName, membersData, type, details) {

  let count = 0;
  let rows = "";

  const formattedDate = Utilities.formatDate(new Date(details[3]), "GMT+5:30", "EEEE, dd/MM/yyyy");
  const startTime = (details[4] instanceof Date) ? Utilities.formatDate(details[4], "GMT+5:30", "HH:mm") : details[4];
  const endTime = (details[5] instanceof Date) ? Utilities.formatDate(details[5], "GMT+5:30", "HH:mm") : details[5];
  const personInCharge = details[8];

  const isCancel = type === "CANCELLED";
  const statusColor = isCancel ? "#d63031" : "#0056b3";
  const displayTitle = isCancel ? `CANCELLATION: Team ${teamName} Meeting` : `New Meeting Scheduled: ${teamName}`;

  membersData.forEach(member => {

    if (member[3] && member[3].toLowerCase() === teamName.toLowerCase()) {

      let content = isCancel ? 

        `<p>Please note that the following meeting has been <strong>CANCELLED</strong>.</p>
         <div style="background:#fff5f5; border-left:4px solid ${statusColor}; padding:15px; margin:15px 0; line-height:1.8;">
           <strong>Team:</strong> ${teamName}<br>
           <strong>Original Date:</strong> ${formattedDate}<br>
           <strong>Agenda:</strong> ${details[7]}<br>
           <strong>Cancelled By:</strong> ${personInCharge}
         </div>`

        :

        `<p>A new meeting has been scheduled for your team:</p>
         <div style="background:#f7fafc; border-left:4px solid ${statusColor}; padding:15px; margin:15px 0; line-height:1.8;">
           <strong>Team:</strong> ${teamName}<br>
           <strong>Date:</strong> ${formattedDate}<br>
           <strong>Time:</strong> ${startTime} - ${endTime}<br>
           <strong>Venue:</strong> ${details[6]}<br>
           <strong>Agenda:</strong> ${details[7]}<br>
           <strong>Scheduled By:</strong> ${personInCharge}
         </div>`;

      let html = getEmailHtml(member[0], displayTitle, content, teamName, statusColor);

      // ----------- ICS CALENDAR GENERATION -----------

      let attachments = [];

      if (!isCancel) {

        var start = new Date(details[3]);
        var end = new Date(details[3]);

        var startParts = startTime.split(":");
        var endParts = endTime.split(":");

        start.setHours(startParts[0], startParts[1]);
        end.setHours(endParts[0], endParts[1]);

        var title = "SEDS " + teamName + " Meeting";
        var description = details[7];
        var location = details[6];

        var ics =
"BEGIN:VCALENDAR\n" +
"VERSION:2.0\n" +
"CALSCALE:GREGORIAN\n" +
"METHOD:REQUEST\n" +
"BEGIN:VEVENT\n" +
"SUMMARY:" + title + "\n" +
"DESCRIPTION:" + description + "\n" +
"LOCATION:" + location + "\n" +
"DTSTART:" + Utilities.formatDate(start, "UTC", "yyyyMMdd'T'HHmmss'Z'") + "\n" +
"DTEND:" + Utilities.formatDate(end, "UTC", "yyyyMMdd'T'HHmmss'Z'") + "\n" +
"STATUS:CONFIRMED\n" +
"END:VEVENT\n" +
"END:VCALENDAR";

        var blob = Utilities.newBlob(ics, "text/calendar", "SEDS-Meeting.ics");

        attachments = [blob];

      }

      if (smartSendEmail(member[2], `[SEDS] ${displayTitle}`, html, attachments)) {

        count++;

        rows += `<tr><td style="padding:8px; border:1px solid #ddd;">${member[0]}</td><td style="padding:8px; border:1px solid #ddd;">${teamName}</td><td style="padding:8px; border:1px solid #ddd;">${formattedDate}</td></tr>`;

      }

    }

  });

  return { count: count, rows: rows };

}


/**
 * SMART SEND EMAIL
 */

function smartSendEmail(to, subject, htmlBody, attachments) {

  let mainQuota = MailApp.getRemainingDailyQuota();

  try {

    if (mainQuota > 5) {

      MailApp.sendEmail({
        to: to,
        name: SENDER_NAME,
        subject: subject,
        htmlBody: htmlBody,
        attachments: attachments
      });

      return true;

    }

    let res1 = callWorker(WORKER_1_URL, to, subject, htmlBody);

    if (res1 && !isNaN(res1)) return true;

    let res2 = callWorker(WORKER_2_URL, to, subject, htmlBody);

    if (res2 && !isNaN(res2)) return true;

    return false;

  } catch (e) {

    return false;

  }

}